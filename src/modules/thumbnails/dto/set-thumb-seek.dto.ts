import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SetThumbSeekDto {
  @ApiProperty({ example: 'vacation/beach-day.mp4' })
  @IsString()
  @IsNotEmpty()
  public readonly video!: string;

  @ApiProperty({ example: '00:00:12.500', description: 'Timestamp formatted as HH:MM:SS or HH:MM:SS.ms' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{1,2}:\d{2}:\d{2}(\.\d+)?$/, {
    message: 'seek must be formatted as HH:MM:SS or HH:MM:SS.ms',
  })
  public readonly seek!: string;
}
