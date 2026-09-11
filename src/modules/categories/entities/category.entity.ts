import { ApiProperty } from '@nestjs/swagger';

export class CategoryEntity {
  @ApiProperty({ example: 4 })
  public readonly id!: number;

  @ApiProperty({ example: 'Travel' })
  public readonly name!: string;

  @ApiProperty({ example: '#4caf50' })
  public readonly color!: string;

  @ApiProperty({ example: 2, nullable: true })
  public readonly position!: number | null;

  @ApiProperty({ example: false })
  public readonly isReserved!: boolean;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  public readonly createdAt!: Date;

  @ApiProperty({ example: '2026-01-20T08:00:00.000Z' })
  public readonly updatedAt!: Date;
}
