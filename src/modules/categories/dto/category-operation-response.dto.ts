import { ApiProperty } from '@nestjs/swagger';
import { CategoryEntity } from '../entities/category.entity';

export class CategoryOperationResponseDto {
  @ApiProperty({ example: true })
  public readonly ok!: true;

  @ApiProperty({ type: CategoryEntity })
  public readonly category!: CategoryEntity;
}

export class ReorderCategoriesResponseDto {
  @ApiProperty({ example: true })
  public readonly ok!: true;

  @ApiProperty({ type: [Number], example: [3, 1, 2, 4] })
  public readonly ids!: number[];
}
