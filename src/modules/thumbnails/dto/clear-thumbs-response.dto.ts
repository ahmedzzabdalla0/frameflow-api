import { ApiProperty } from '@nestjs/swagger';

export class ClearThumbsResponseDto {
  @ApiProperty({ example: true })
  public readonly ok!: true;

  @ApiProperty({ example: 84 })
  public readonly deleted!: number;
}
