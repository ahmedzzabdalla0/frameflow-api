import { ApiProperty } from '@nestjs/swagger';
import { VideoResponseDto } from './video-response.dto';

export class BulkUpdateCategoriesResponseDto {
  @ApiProperty({ example: true })
  public readonly ok!: true;

  @ApiProperty({ example: 3 })
  public readonly updated!: number;
}

export class UpdateVideoResponseDto {
  @ApiProperty({ example: true })
  public readonly ok!: true;

  @ApiProperty({ type: VideoResponseDto })
  public readonly video!: VideoResponseDto;
}

export class ToggleDislikeResponseDto {
  @ApiProperty({ example: true })
  public readonly ok!: true;

  @ApiProperty({ example: true })
  public readonly disliked!: boolean;

  @ApiProperty({ type: VideoResponseDto })
  public readonly video!: VideoResponseDto;
}

export class SetRatingResponseDto {
  @ApiProperty({ example: true })
  public readonly ok!: true;

  @ApiProperty({ example: 4.5 })
  public readonly rating!: number;
}

export class ScanResponseDto {
  @ApiProperty({ example: true })
  public readonly ok!: true;

  @ApiProperty({ example: 5 })
  public readonly added!: number;
}

export class RefreshMetadataResponseDto {
  @ApiProperty({ example: true })
  public readonly ok!: true;

  @ApiProperty({ example: 12 })
  public readonly refreshed!: number;
}
