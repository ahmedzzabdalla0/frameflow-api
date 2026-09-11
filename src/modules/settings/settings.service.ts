import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DISLIKES_CATEGORY_NAME } from '../../common/constants/reserved-category.constant';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { PlayerSettingsResponseDto } from './dto/player-settings-response.dto';

@Injectable()
export class SettingsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getSettings(): Promise<PlayerSettingsResponseDto> {
    const settings = await this.getOrCreateSettingsRow();
    return this.toResponse(settings);
  }

  public async updateSettings(dto: UpdateSettingsDto): Promise<{ ok: true }> {
    const settings = await this.getOrCreateSettingsRow();

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.playerSettings.update({
        where: { id: settings.id },
        data: {
          ...(dto.default_pure_only !== undefined ? { defaultPureOnly: dto.default_pure_only } : {}),
          ...(dto.default_intersection_only !== undefined
            ? { defaultIntersectionOnly: dto.default_intersection_only }
            : {}),
        },
      });

      if (dto.default_included_categories !== undefined) {
        const categoryIds = await this.resolveCategoryIds(tx, dto.default_included_categories);
        await tx.playerSettingsIncludedCategory.deleteMany({ where: { settingsId: settings.id } });
        if (categoryIds.length > 0) {
          await tx.playerSettingsIncludedCategory.createMany({
            data: categoryIds.map((categoryId) => ({ settingsId: settings.id, categoryId })),
          });
        }
      }

      if (dto.default_excluded_categories !== undefined) {
        const categoryIds = await this.resolveCategoryIds(tx, dto.default_excluded_categories);
        await tx.playerSettingsExcludedCategory.deleteMany({ where: { settingsId: settings.id } });
        if (categoryIds.length > 0) {
          await tx.playerSettingsExcludedCategory.createMany({
            data: categoryIds.map((categoryId) => ({ settingsId: settings.id, categoryId })),
          });
        }
      }
    });

    return { ok: true };
  }

  private async resolveCategoryIds(tx: Prisma.TransactionClient, categoryNames: string[]): Promise<number[]> {
    const filteredNames = categoryNames.filter((name) => name !== DISLIKES_CATEGORY_NAME);
    if (filteredNames.length === 0) {
      return [];
    }
    const categories = await tx.category.findMany({ where: { name: { in: filteredNames } } });
    return categories.map((category) => category.id);
  }

  private async getOrCreateSettingsRow() {
    const existing = await this.prisma.playerSettings.findFirst({
      include: {
        includedCategories: { include: { category: true } },
        excludedCategories: { include: { category: true } },
      },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.playerSettings.create({
      data: {},
      include: {
        includedCategories: { include: { category: true } },
        excludedCategories: { include: { category: true } },
      },
    });
  }

  private toResponse(
    settings: Awaited<ReturnType<SettingsService['getOrCreateSettingsRow']>>,
  ): PlayerSettingsResponseDto {
    return {
      default_included_categories: settings.includedCategories.map((link) => link.category.name),
      default_excluded_categories: settings.excludedCategories.map((link) => link.category.name),
      default_pure_only: settings.defaultPureOnly,
      default_intersection_only: settings.defaultIntersectionOnly,
    };
  }
}
