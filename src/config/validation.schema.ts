import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3568),
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD: Joi.string().min(8).required(),
  UPLOADS_DIR: Joi.string().default('./storage/uploads'),
  THUMBS_DIR: Joi.string().default('./storage/thumbs'),
  VIDEO_EXTENSIONS: Joi.string().default('.mp4,.mov,.webm,.m4v,.mkv'),
  CORS_ORIGIN: Joi.string().default('*'),
  THROTTLE_TTL_SECONDS: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(120),
});
