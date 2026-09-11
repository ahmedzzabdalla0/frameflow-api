export interface AppConfig {
  nodeEnv: string;
  port: number;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  admin: {
    email: string;
    password: string;
  };
  storage: {
    uploadsDir: string;
    thumbsDir: string;
    videoExtensions: string[];
  };
  cors: {
    origin: string;
  };
  throttle: {
    ttlSeconds: number;
    limit: number;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3568', 10),
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  admin: {
    email: process.env.ADMIN_EMAIL ?? '',
    password: process.env.ADMIN_PASSWORD ?? '',
  },
  storage: {
    uploadsDir: process.env.UPLOADS_DIR ?? './storage/uploads',
    thumbsDir: process.env.THUMBS_DIR ?? './storage/thumbs',
    videoExtensions: (process.env.VIDEO_EXTENSIONS ?? '.mp4,.mov,.webm,.m4v,.mkv')
      .split(',')
      .map((extension) => extension.trim().toLowerCase())
      .filter(Boolean),
  },
  cors: {
    origin: process.env.CORS_ORIGIN ?? '*',
  },
  throttle: {
    ttlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
  },
});
