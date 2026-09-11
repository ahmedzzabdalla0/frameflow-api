import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  public constructor(private readonly prisma: PrismaService) {}

  public async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  public async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  public async createAdmin(email: string, passwordHash: string): Promise<User> {
    return this.prisma.user.create({
      data: { email, passwordHash, role: 'ADMIN' },
    });
  }
}
