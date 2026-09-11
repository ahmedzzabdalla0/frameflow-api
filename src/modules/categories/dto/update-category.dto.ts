import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ maxLength: 100, example: 'Travel' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value.trim())
  public readonly name?: string;

  @ApiPropertyOptional({ maxLength: 20, example: '#4caf50' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  public readonly color?: string;
}
