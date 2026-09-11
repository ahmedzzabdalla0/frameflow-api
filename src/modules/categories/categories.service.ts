import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';
import {
  DISLIKES_CATEGORY_NAME,
  LEGACY_DISLIKES_CATEGORY_NAMES,
  UNCATEGORIZED_CATEGORY_KEY,
} from '../../common/constants/reserved-category.constant';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategorySummaryResponseDto, CategoryVideoPathMap } from './dto/category-response.dto';
import { sortCategoriesByPosition } from './utils/category-sort.util';

@Injectable()
export class CategoriesService {
  public constructor(private readonly prisma: PrismaService) {}

  public async ensureDislikesCategory(): Promise<Category> {
    const existing = await this.prisma.category.findFirst({
      where: { name: { equals: DISLIKES_CATEGORY_NAME, mode: 'insensitive' } },
    });

    const legacyCategories = await this.prisma.category.findMany({
      where: {
        name: { in: [...LEGACY_DISLIKES_CATEGORY_NAMES], mode: 'insensitive' },
        ...(existing ? { NOT: { id: existing.id } } : {}),
      },
      include: { videos: true },
    });

    const dislikesCategory =
      existing ??
      (await this.prisma.category.create({
        data: { name: DISLIKES_CATEGORY_NAME, color: '#e44444', isReserved: true },
      }));

    if (!dislikesCategory.isReserved || dislikesCategory.name !== DISLIKES_CATEGORY_NAME) {
      await this.prisma.category.update({
        where: { id: dislikesCategory.id },
        data: { name: DISLIKES_CATEGORY_NAME, isReserved: true },
      });
    }

    for (const legacyCategory of legacyCategories) {
      for (const videoLink of legacyCategory.videos) {
        await this.prisma.videoCategory.upsert({
          where: {
            videoId_categoryId: { videoId: videoLink.videoId, categoryId: dislikesCategory.id },
          },
          create: { videoId: videoLink.videoId, categoryId: dislikesCategory.id },
          update: {},
        });
      }
      await this.prisma.category.delete({ where: { id: legacyCategory.id } });
    }

    return dislikesCategory;
  }

  public async getCategoryVideoPathMap(): Promise<CategoryVideoPathMap> {
    const categories = await this.prisma.category.findMany({
      include: { videos: { include: { video: true } } },
    });
    const ordered = sortCategoriesByPosition(categories);
    const regularCategories = ordered.filter((category) => category.name !== DISLIKES_CATEGORY_NAME);
    const dislikeCategories = ordered.filter((category) => category.name === DISLIKES_CATEGORY_NAME);

    const pathMap: CategoryVideoPathMap = {};
    for (const category of regularCategories) {
      pathMap[category.name] = category.videos.map((link) => link.video.relPath);
    }

    pathMap[UNCATEGORIZED_CATEGORY_KEY] = (
      await this.prisma.video.findMany({ where: { categories: { none: {} } } })
    ).map((video) => video.relPath);

    for (const category of dislikeCategories) {
      pathMap[category.name] = category.videos.map((link) => link.video.relPath);
    }

    return pathMap;
  }

  public async getFullCategoryList(): Promise<CategorySummaryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      include: { _count: { select: { videos: true } } },
    });
    const ordered = sortCategoriesByPosition(categories);
    const regular = ordered.filter((category) => category.name !== DISLIKES_CATEGORY_NAME);
    const dislikes = ordered.filter((category) => category.name === DISLIKES_CATEGORY_NAME);

    const uncategorizedCount = await this.prisma.video.count({ where: { categories: { none: {} } } });

    const toSummary = (category: (typeof ordered)[number]): CategorySummaryResponseDto => ({
      id: category.id,
      name: category.name,
      color: category.color,
      count: category._count.videos,
    });

    return [
      ...regular.map(toSummary),
      { id: 0, name: UNCATEGORIZED_CATEGORY_KEY, color: '#777', count: uncategorizedCount },
      ...dislikes.map(toSummary),
    ];
  }

  public async reorder(requestedIds: number[]): Promise<number[]> {
    const dislikesCategory = await this.ensureDislikesCategory();
    const allCategories = await this.prisma.category.findMany({ select: { id: true } });
    const validIds = new Set(allCategories.map((category) => category.id));

    const orderedIds: number[] = [];
    for (const id of requestedIds) {
      if (validIds.has(id) && id !== dislikesCategory.id && !orderedIds.includes(id)) {
        orderedIds.push(id);
      }
    }

    for (const id of [...validIds].sort((a, b) => a - b)) {
      if (id !== dislikesCategory.id && !orderedIds.includes(id)) {
        orderedIds.push(id);
      }
    }

    orderedIds.push(dislikesCategory.id);

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.category.update({ where: { id }, data: { position: index } }),
      ),
    );

    return orderedIds;
  }

  public async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    this.assertNotReservedName(createCategoryDto.name);

    const existing = await this.prisma.category.findUnique({ where: { name: createCategoryDto.name } });
    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }

    return this.prisma.category.create({
      data: { name: createCategoryDto.name, color: createCategoryDto.color ?? '#e44' },
    });
  }

  public async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.getCategoryOrThrow(id);
    if (category.name === DISLIKES_CATEGORY_NAME) {
      throw new ForbiddenException('The dislikes category is protected and cannot be modified');
    }

    if (updateCategoryDto.name) {
      this.assertNotReservedName(updateCategoryDto.name);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(updateCategoryDto.name ? { name: updateCategoryDto.name } : {}),
        ...(updateCategoryDto.color ? { color: updateCategoryDto.color } : {}),
      },
    });
  }

  public async remove(id: number): Promise<void> {
    const category = await this.getCategoryOrThrow(id);
    if (category.name === DISLIKES_CATEGORY_NAME) {
      throw new ForbiddenException('The dislikes category is protected and cannot be deleted');
    }

    await this.prisma.category.delete({ where: { id } });
  }

  private async getCategoryOrThrow(id: number): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category ${id} was not found`);
    }
    return category;
  }

  private assertNotReservedName(name: string): void {
    const normalized = name.trim().toLowerCase();
    const reservedNames = [DISLIKES_CATEGORY_NAME, ...LEGACY_DISLIKES_CATEGORY_NAMES];
    if (reservedNames.includes(normalized)) {
      throw new ConflictException('This category name is reserved');
    }
  }
}
