import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { INestApplication, Logger, RequestMethod } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

function setupSwagger(app: INestApplication): void {
  const documentConfig = new DocumentBuilder()
    .setTitle('FrameFlow API')
    .setDescription('Production-ready NestJS + PostgreSQL + Prisma backend for the FrameFlow player')
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addTag('auth', 'Authenticate and obtain an access token')
    .addTag('videos', 'Browse, curate, and manage the video library')
    .addTag('categories', 'Organize videos into categories')
    .addTag('thumbnails', 'Generate and manage video thumbnails')
    .addTag('settings', 'Default player settings')
    .addTag('media', 'Stream raw video files')
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup('api/docs', app, document);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AppConfig, true>);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.enableCors({
    origin: configService.get('cors.origin', { infer: true }),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'video/:filename', method: RequestMethod.GET }],
  });

  setupSwagger(app);

  const port = configService.get('port', { infer: true });
  await app.listen(port);

  Logger.log(`FrameFlow API listening on port ${port}`, 'Bootstrap');
  Logger.log('Swagger documentation available at /api/docs', 'Bootstrap');
}

void bootstrap();
