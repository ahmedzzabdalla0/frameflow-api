import { ApiProperty } from '@nestjs/swagger';

export class PlayerSettingsResponseDto {
  @ApiProperty({ type: [String], example: ['travel', 'family'] })
  public readonly default_included_categories!: string[];

  @ApiProperty({ type: [String], example: ['dislikes'] })
  public readonly default_excluded_categories!: string[];

  @ApiProperty({ example: false })
  public readonly default_pure_only!: boolean;

  @ApiProperty({ example: false })
  public readonly default_intersection_only!: boolean;
}
