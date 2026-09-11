import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration, { AppConfig } from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VideosModule } from './modules/videos/videos.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ThumbnailsModule } from './modules/thumbnails/thumbnails.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MediaModule } from './modules/media/media.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { FfmpegModule } from './modules/ffmpeg/ffmpeg.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: (config: Record<string, unknown>) => {
        if (!validationSchema) {
          throw new Error('validationSchema is undefined. Please verify the export in validation.schema.ts');
        }
        const result = validationSchema.validate(config, {
          allowUnknown: true,
          abortEarly: false,
        }) as { error?: { message: string }; value: Record<string, unknown> };
        if (result.error) {
          throw new Error(`Config validation error: ${result.error.message}`);
        }
        return result.value;
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => [
        {
          ttl: configService.get('throttle.ttlSeconds', { infer: true }) * 1000,
          limit: configService.get('throttle.limit', { infer: true }),
        },
      ],
    }),
    PrismaModule,
    FfmpegModule,
    ScannerModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    VideosModule,
    ThumbnailsModule,
    SettingsModule,
    MediaModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
