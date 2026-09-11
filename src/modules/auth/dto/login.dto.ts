import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@frameflow.local' })
  @IsEmail()
  public readonly email!: string;

  @ApiProperty({ minLength: 8, example: 'correct-horse-battery-staple' })
  @IsString()
  @MinLength(8)
  public readonly password!: string;
}
