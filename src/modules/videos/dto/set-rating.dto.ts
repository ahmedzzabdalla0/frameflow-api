import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class SetRatingDto {
  @ApiProperty({ example: 'vacation/beach-day.mp4' })
  @IsString()
  @IsNotEmpty()
  public readonly video!: string;

  @ApiProperty({ minimum: 0, maximum: 5, example: 4.5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  public readonly rating!: number;
}
