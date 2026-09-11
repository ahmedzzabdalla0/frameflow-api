import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ type: [String], example: ['travel', 'family'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public readonly default_included_categories?: string[];

  @ApiPropertyOptional({ type: [String], example: ['dislikes'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public readonly default_excluded_categories?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  public readonly default_pure_only?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  public readonly default_intersection_only?: boolean;
}
