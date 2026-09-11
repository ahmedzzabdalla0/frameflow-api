import { ApiProperty } from '@nestjs/swagger';

export class CategorySummaryResponseDto {
  @ApiProperty({ example: 4 })
  public readonly id!: number;

  @ApiProperty({ example: 'Travel' })
  public readonly name!: string;

  @ApiProperty({ example: '#4caf50' })
  public readonly color!: string;

  @ApiProperty({ example: 17 })
  public readonly count!: number;
}

export type CategoryVideoPathMap = Record<string, string[]>;
