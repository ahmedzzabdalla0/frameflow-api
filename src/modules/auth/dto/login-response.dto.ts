import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AuthenticatedUserDto {
  @ApiProperty({ example: '9f8f2e6e-9c1b-4b8f-9d3e-1a2b3c4d5e6f' })
  public readonly id!: string;

  @ApiProperty({ example: 'admin@frameflow.local' })
  public readonly email!: string;

  @ApiProperty({ enum: UserRole, example: 'ADMIN' })
  public readonly role!: UserRole;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Signed JSON Web Token to send as a Bearer token' })
  public readonly accessToken!: string;

  @ApiProperty({ example: '1d', description: 'Token lifetime, expressed as a zeit/ms style duration' })
  public readonly expiresIn!: string;

  @ApiProperty({ type: AuthenticatedUserDto })
  public readonly user!: AuthenticatedUserDto;
}
