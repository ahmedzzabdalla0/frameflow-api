import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsInt } from 'class-validator';

export class ReorderCategoriesDto {
  @ApiProperty({ type: [Number], example: [3, 1, 2] })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  public readonly ids!: number[];
}
