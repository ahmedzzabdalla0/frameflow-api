import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SortOrder } from '../enums/sort-order.enum';
import { VideoSortField } from '../enums/video-sort-field.enum';

export class QueryVideosDto {
  @ApiPropertyOptional({ description: 'Filter by category name, or "__uncategorized__"' })
  @IsOptional()
  @IsString()
  public readonly category?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive search against the video title' })
  @IsOptional()
  @IsString()
  public readonly q?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 10000, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  public readonly per_page: number = 50;

  @ApiPropertyOptional({ enum: VideoSortField, default: VideoSortField.DATE })
  @IsOptional()
  @IsEnum(VideoSortField)
  public readonly sort: VideoSortField = VideoSortField.DATE;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  public readonly order: SortOrder = SortOrder.DESC;
}
