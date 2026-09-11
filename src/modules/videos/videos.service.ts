import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Video } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { rename, rm, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { DISLIKES_CATEGORY_NAME } from '../../common/constants/reserved-category.constant';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { sortCategoriesByPosition } from '../categories/utils/category-sort.util';
import { FfmpegService } from '../ffmpeg/ffmpeg.service';
import { ScannerService } from '../scanner/scanner.service';
import { ThumbnailsService } from '../thumbnails/thumbnails.service';
import { BulkUpdateCategoriesDto } from './dto/bulk-update-categories.dto';
import { QueryVideosDto } from './dto/query-videos.dto';
import { RefreshMetadataDto } from './dto/refresh-metadata.dto';
import { SetRatingDto } from './dto/set-rating.dto';
import { ToggleDislikeDto } from './dto/toggle-dislike.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { SortOrder } from './enums/sort-order.enum';
import { VideoSortField } from './enums/video-sort-field.enum';
import {
  PaginatedVideosResponseDto,
  VideoResponseDto,
  VideoStatsResponseDto,
} from './dto/video-response.dto';

type VideoWithCategories = Prisma.VideoGetPayload<{
  include: { categories: { include: { category: true } }; thumbSeek: true };
}>;

const VIDEO_WITH_CATEGORIES_INCLUDE = {
  categories: { include: { category: true } },
  thumbSeek: true,
} as const;

@Injectable()
export class VideosService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly scannerService: ScannerService,
    private readonly ffmpegService: FfmpegService,
    private readonly thumbnailsService: ThumbnailsService,
  ) {}

  public async getStats(): Promise<VideoStatsResponseDto> {
    const [totalVideos, sizeAggregate] = await Promise.all([
      this.prisma.video.count(),
      this.prisma.video.aggregate({ _sum: { sizeBytes: true } }),
    ]);

    return {
      total_videos: totalVideos,
      total_size_bytes: Number(sizeAggregate._sum.sizeBytes ?? 0n),
    };
  }

  public async listVideos(query: QueryVideosDto): Promise<PaginatedVideosResponseDto> {
    const where = await this.buildWhereClause(query);
    if (where === null) {
      return { videos: [], total: 0 };
    }

    const total = await this.prisma.video.count({ where });
    const orderBy = this.buildOrderBy(query.sort, query.order);

    const videos = await this.prisma.video.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.per_page,
      take: query.per_page,
      include: VIDEO_WITH_CATEGORIES_INCLUDE,
    });

    return { videos: videos.map((video) => this.toVideoResponse(video)), total };
  }

  public async update(id: number, updateVideoDto: UpdateVideoDto): Promise<VideoResponseDto> {
    await this.getVideoOrThrow(id);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const data: Prisma.VideoUpdateInput = {};

      if (updateVideoDto.title !== undefined) {
        const trimmedTitle = updateVideoDto.title.trim();
        if (trimmedTitle) {
          data.title = trimmedTitle;
        }
      }

      if (updateVideoDto.rating !== undefined) {
        data.rating = updateVideoDto.rating;
      }

      if (Object.keys(data).length > 0) {
        await tx.video.update({ where: { id }, data });
      }

      if (updateVideoDto.categories !== undefined) {
        const requestedCategories = await tx.category.findMany({
          where: { name: { in: updateVideoDto.categories } },
        });
        const dislikesCategory = await this.categoriesService.ensureDislikesCategory();

        const finalCategoryIds = new Set(
          requestedCategories
            .filter((category) => category.name !== DISLIKES_CATEGORY_NAME)
            .map((category) => category.id),
        );
        if (requestedCategories.some((category) => category.id === dislikesCategory.id)) {
          finalCategoryIds.add(dislikesCategory.id);
        }

        await tx.videoCategory.deleteMany({ where: { videoId: id } });
        if (finalCategoryIds.size > 0) {
          await tx.videoCategory.createMany({
            data: [...finalCategoryIds].map((categoryId) => ({ videoId: id, categoryId })),
          });
        }
      }
    });

    return this.getVideoResponseOrThrow(id);
  }

  public async bulkUpdateCategories(dto: BulkUpdateCategoriesDto): Promise<{ ok: true; updated: number }> {
    const uniqueIds = [...new Set(dto.ids)];
    const videos = await this.prisma.video.findMany({ where: { id: { in: uniqueIds } } });
    if (videos.length !== uniqueIds.length) {
      throw new NotFoundException('One or more videos were not found');
    }

    const uniqueNames = [...new Set(dto.categories)];
    const categories = await this.prisma.category.findMany({ where: { name: { in: uniqueNames } } });
    if (categories.length !== uniqueNames.length) {
      throw new NotFoundException('One or more categories were not found');
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.videoCategory.deleteMany({ where: { videoId: { in: uniqueIds } } });
      if (categories.length > 0) {
        await tx.videoCategory.createMany({
          data: uniqueIds.flatMap((videoId) =>
            categories.map((category) => ({ videoId, categoryId: category.id })),
          ),
        });
      }
    });

    return { ok: true, updated: videos.length };
  }

  public async toggleDislike(
    dto: ToggleDislikeDto,
  ): Promise<{ ok: true; disliked: boolean; video: VideoResponseDto }> {
    const relPath = this.normalizeRelPath(dto.video);
    const video = await this.prisma.video.findUnique({
      where: { relPath },
      include: VIDEO_WITH_CATEGORIES_INCLUDE,
    });
    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const dislikesCategory = await this.categoriesService.ensureDislikesCategory();
    const isCurrentlyDisliked = video.categories.some((link) => link.categoryId === dislikesCategory.id);
    const shouldBeDisliked = dto.disliked ?? !isCurrentlyDisliked;

    if (shouldBeDisliked && !isCurrentlyDisliked) {
      await this.prisma.videoCategory.create({
        data: { videoId: video.id, categoryId: dislikesCategory.id },
      });
    } else if (!shouldBeDisliked && isCurrentlyDisliked) {
      await this.prisma.videoCategory.delete({
        where: { videoId_categoryId: { videoId: video.id, categoryId: dislikesCategory.id } },
      });
    }

    return {
      ok: true,
      disliked: shouldBeDisliked,
      video: await this.getVideoResponseOrThrow(video.id),
    };
  }

  public async setRating(dto: SetRatingDto): Promise<{ ok: true; rating: number }> {
    const relPath = this.normalizeRelPath(dto.video);
    const video = await this.prisma.video.findUnique({ where: { relPath } });
    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const updated = await this.prisma.video.update({ where: { id: video.id }, data: { rating: dto.rating } });
    return { ok: true, rating: updated.rating ?? 0 };
  }

  public async remove(id: number): Promise<{ ok: true }> {
    const video = await this.getVideoOrThrow(id);
    const uploadsDir = resolve(this.scannerService.getUploadsDir());
    const videoAbsolutePath = resolve(this.scannerService.resolveAbsolutePath(video.relPath));

    if (isAbsolute(videoAbsolutePath) && relative(uploadsDir, videoAbsolutePath).startsWith('..')) {
      throw new BadRequestException('Invalid video path');
    }

    const quarantinePath = `${videoAbsolutePath}.deleting-${randomUUID()}`;
    let fileQuarantined = false;

    try {
      try {
        await rename(videoAbsolutePath, quarantinePath);
        fileQuarantined = true;
      } catch {
        fileQuarantined = false;
      }

      await this.prisma.video.delete({ where: { id } });
    } catch (error) {
      if (fileQuarantined) {
        await rename(quarantinePath, videoAbsolutePath).catch(() => undefined);
      }
      throw error;
    }

    if (fileQuarantined) {
      await rm(quarantinePath, { force: true }).catch(() => undefined);
    }
    await this.thumbnailsService.bustThumbnailCache(video.relPath);

    return { ok: true };
  }

  public async scan(): Promise<{ ok: true; added: number }> {
    const newVideos = await this.scannerService.scanForNewVideos();
    return { ok: true, added: newVideos.length };
  }

  public async refreshMetadata(dto: RefreshMetadataDto): Promise<{ ok: true; refreshed: number }> {
    const videos = await this.prisma.video.findMany({
      where: dto.ids && dto.ids.length > 0 ? { id: { in: dto.ids } } : undefined,
    });

    for (const video of videos) {
      const absolutePath = this.scannerService.resolveAbsolutePath(video.relPath);
      const durationSeconds = await this.ffmpegService.probeDurationSeconds(absolutePath);
      const sizeBytes = await this.safeFileSize(absolutePath);
      await this.prisma.video.update({
        where: { id: video.id },
        data: { durationSeconds, sizeBytes: BigInt(sizeBytes) },
      });
    }

    return { ok: true, refreshed: videos.length };
  }

  private async safeFileSize(absolutePath: string): Promise<number> {
    try {
      const fileStat = await stat(absolutePath);
      return fileStat.size;
    } catch {
      return 0;
    }
  }

  private async getVideoOrThrow(id: number): Promise<Video> {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) {
      throw new NotFoundException(`Video ${id} was not found`);
    }
    return video;
  }

  private async getVideoResponseOrThrow(id: number): Promise<VideoResponseDto> {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: VIDEO_WITH_CATEGORIES_INCLUDE,
    });
    if (!video) {
      throw new NotFoundException(`Video ${id} was not found`);
    }
    return this.toVideoResponse(video);
  }

  private normalizeRelPath(rawPath: string): string {
    return rawPath.replace(/\\/g, '/').split('/').pop()?.trim() ?? rawPath;
  }

  private toVideoResponse(video: VideoWithCategories): VideoResponseDto {
    const orderedCategories = sortCategoriesByPosition(video.categories.map((link) => link.category));
    return {
      id: video.id,
      rel_path: video.relPath,
      title: video.title,
      added_at: video.addedAt.toISOString(),
      duration_seconds: video.durationSeconds ?? 0,
      size_bytes: Number(video.sizeBytes ?? 0n),
      rating: video.rating ?? null,
      categories: orderedCategories.map((category) => category.name),
      ...(video.thumbSeek ? { thumb_seek: video.thumbSeek.seekTime } : {}),
    };
  }

  private async buildWhereClause(query: QueryVideosDto): Promise<Prisma.VideoWhereInput | null> {
    const conditions: Prisma.VideoWhereInput[] = [];

    if (query.category) {
      if (query.category === '__uncategorized__') {
        conditions.push({ categories: { none: {} } });
      } else {
        const category = await this.prisma.category.findUnique({ where: { name: query.category } });
        if (!category) {
          return null;
        }
        conditions.push({ categories: { some: { categoryId: category.id } } });
      }
    }

    if (query.q) {
      conditions.push({ title: { contains: query.q, mode: 'insensitive' } });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  private buildOrderBy(sortField: VideoSortField, order: SortOrder): Prisma.VideoOrderByWithRelationInput {
    switch (sortField) {
      case VideoSortField.TITLE:
        return { title: order };
      case VideoSortField.SIZE:
        return { sizeBytes: order };
      case VideoSortField.RATING:
        return { rating: order };
      case VideoSortField.DURATION:
        return { durationSeconds: order };
      case VideoSortField.DATE:
      default:
        return { addedAt: order };
    }
  }
}
