import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import { FfmpegService } from '../ffmpeg/ffmpeg.service';
import { ScannerService } from '../scanner/scanner.service';
import { SetThumbSeekDto } from './dto/set-thumb-seek.dto';

const IN_FLIGHT_GENERATION_LOCKS = new Map<string, Promise<boolean>>();

@Injectable()
export class ThumbnailsService {
  private readonly logger = new Logger(ThumbnailsService.name);
  private readonly thumbsDir: string;

  public constructor(
    private readonly prisma: PrismaService,
    private readonly scannerService: ScannerService,
    private readonly ffmpegService: FfmpegService,
    configService: ConfigService<AppConfig, true>,
  ) {
    this.thumbsDir = configService.get('storage.thumbsDir', { infer: true });
  }

  public thumbnailFileName(relPath: string): string {
    return `${relPath.replace(/\//g, '__')}.jpg`;
  }

  public thumbnailAbsolutePath(relPath: string): string {
    return join(this.thumbsDir, this.thumbnailFileName(relPath));
  }

  public async resolveOrGenerateThumbnail(rawRelPath: string): Promise<string | null> {
    const fileName = this.normalizeFileName(rawRelPath);
    const video = await this.prisma.video.findUnique({
      where: { relPath: fileName },
      include: { thumbSeek: true },
    });
    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const outputPath = this.thumbnailAbsolutePath(fileName);
    if (existsSync(outputPath)) {
      return outputPath;
    }

    const inFlight = IN_FLIGHT_GENERATION_LOCKS.get(outputPath);
    if (inFlight) {
      const succeeded = await inFlight;
      return succeeded ? outputPath : null;
    }

    const videoAbsolutePath = this.scannerService.resolveAbsolutePath(fileName);
    const generationPromise = this.ffmpegService
      .generateThumbnail(videoAbsolutePath, outputPath, video.thumbSeek?.seekTime)
      .finally(() => {
        IN_FLIGHT_GENERATION_LOCKS.delete(outputPath);
      });

    IN_FLIGHT_GENERATION_LOCKS.set(outputPath, generationPromise);
    const succeeded = await generationPromise;
    return succeeded ? outputPath : null;
  }

  public async setThumbSeek(dto: SetThumbSeekDto): Promise<{ ok: true }> {
    const fileName = this.normalizeFileName(dto.video);
    const video = await this.prisma.video.findUnique({ where: { relPath: fileName } });
    if (!video) {
      throw new NotFoundException('Video not in database');
    }

    await this.prisma.thumbSeek.upsert({
      where: { videoId: video.id },
      create: { videoId: video.id, seekTime: dto.seek },
      update: { seekTime: dto.seek },
    });

    await this.bustThumbnailCache(fileName);
    const videoAbsolutePath = this.scannerService.resolveAbsolutePath(fileName);
    await this.ffmpegService.generateThumbnail(
      videoAbsolutePath,
      this.thumbnailAbsolutePath(fileName),
      dto.seek,
    );

    return { ok: true };
  }

  public async bustThumbnailCache(relPath: string): Promise<void> {
    const outputPath = this.thumbnailAbsolutePath(this.normalizeFileName(relPath));
    await unlink(outputPath).catch(() => undefined);
  }

  public async clearAllThumbnails(): Promise<number> {
    let deletedCount = 0;
    try {
      const entries = await readdir(this.thumbsDir);
      for (const entry of entries) {
        if (entry.endsWith('.jpg')) {
          await unlink(join(this.thumbsDir, entry)).catch(() => undefined);
          deletedCount += 1;
        }
      }
    } catch (error) {
      this.logger.warn(`Unable to clear thumbnails directory: ${(error as Error).message}`);
    }
    return deletedCount;
  }

  private normalizeFileName(rawPath: string): string {
    return rawPath.replace(/\\/g, '/').split('/').pop() ?? rawPath;
  }
}
