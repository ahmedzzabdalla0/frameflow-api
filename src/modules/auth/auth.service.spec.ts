import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: { findByEmail: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  const storedPasswordHash = bcrypt.hashSync('correct-password', 4);

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn() };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('1d') },
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  it('issues an access token for valid credentials', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      passwordHash: storedPasswordHash,
    });

    const result = await authService.login({ email: 'admin@example.com', password: 'correct-password' });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user).toEqual({ id: 'user-1', email: 'admin@example.com', role: 'ADMIN' });
  });

  it('rejects an unknown email', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'ghost@example.com', password: 'whatever123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an incorrect password', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      passwordHash: storedPasswordHash,
    });

    await expect(
      authService.login({ email: 'admin@example.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
