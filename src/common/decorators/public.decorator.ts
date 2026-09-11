import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_ROUTE_KEY = 'isPublicRoute';

export const Public = (): ReturnType<typeof SetMetadata> => SetMetadata(IS_PUBLIC_ROUTE_KEY, true);
