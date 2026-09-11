import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VideoResponseDto {
  @ApiProperty({ example: 1 })
  public readonly id!: number;

  @ApiProperty({ example: 'vacation/beach-day.mp4' })
  public readonly rel_path!: string;

  @ApiProperty({ example: 'Beach Day' })
  public readonly title!: string;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  public readonly added_at!: string;

  @ApiProperty({ example: 184 })
  public readonly duration_seconds!: number;

  @ApiProperty({ example: 52428800 })
  public readonly size_bytes!: number;

  @ApiProperty({ example: 4.5, nullable: true })
  public readonly rating!: number | null;

  @ApiProperty({ type: [String], example: ['travel', 'family'] })
  public readonly categories!: string[];

  @ApiPropertyOptional({ example: '00:00:12.500' })
  public readonly thumb_seek?: string;
}

export class PaginatedVideosResponseDto {
  @ApiProperty({ type: [VideoResponseDto] })
  public readonly videos!: VideoResponseDto[];

  @ApiProperty({ example: 42 })
  public readonly total!: number;
}

export class VideoStatsResponseDto {
  @ApiProperty({ example: 128 })
  public readonly total_videos!: number;

  @ApiProperty({ example: 107374182400 })
  public readonly total_size_bytes!: number;
}
