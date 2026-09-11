import { ApiProperty } from '@nestjs/swagger';

export class OkResponseDto {
  @ApiProperty({ example: true })
  public readonly ok!: true;
}
