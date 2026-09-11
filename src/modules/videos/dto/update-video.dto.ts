import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateVideoDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 255, example: 'Beach Day' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  public readonly title?: string;

  @ApiPropertyOptional({ type: [String], example: ['travel', 'family'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  public readonly categories?: string[];

  @ApiPropertyOptional({ minimum: 0, maximum: 5, nullable: true, example: 4.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  public readonly rating?: number | null;
}
