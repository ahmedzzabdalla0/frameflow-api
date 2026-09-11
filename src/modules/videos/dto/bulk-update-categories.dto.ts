import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsInt, IsString } from 'class-validator';

export class BulkUpdateCategoriesDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  public readonly ids!: number[];

  @ApiProperty({ type: [String], example: ['travel', 'family'] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  public readonly categories!: string[];
}
