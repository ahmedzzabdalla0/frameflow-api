import { Request } from 'express';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
