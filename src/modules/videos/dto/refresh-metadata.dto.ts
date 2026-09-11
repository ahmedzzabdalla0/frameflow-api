import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';

export class RefreshMetadataDto {
  @ApiPropertyOptional({ type: [Number], description: 'When omitted, all videos are refreshed' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  public readonly ids?: number[];
}
