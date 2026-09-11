import { UserRole } from '@prisma/client';

export interface SafeUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}
