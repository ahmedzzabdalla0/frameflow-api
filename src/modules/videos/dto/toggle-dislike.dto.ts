import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ToggleDislikeDto {
  @ApiProperty({ example: 'vacation/beach-day.mp4' })
  @IsString()
  @IsNotEmpty()
  public readonly video!: string;

  @ApiPropertyOptional({ description: 'When omitted, the current state is toggled', example: true })
  @IsOptional()
  @IsBoolean()
  public readonly disliked?: boolean;
}
