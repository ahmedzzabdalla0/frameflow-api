import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';

describe('Application (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'video/:filename', method: RequestMethod.GET }],
    });
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/videos/stats is public and returns aggregate counts', async () => {
    const response = await request(server).get('/api/videos/stats');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('total_videos');
    expect(response.body).toHaveProperty('total_size_bytes');
  });

  it('GET /api/categories/list is public and always includes the uncategorized bucket', async () => {
    const response = await request(server).get('/api/categories/list');
    const body = response.body as { name: string }[];

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((category) => category.name === '__uncategorized__')).toBe(true);
  });

  it('POST /api/categories is public and accepts requests without authentication', async () => {
    const response = await request(server).post('/api/categories').send({ name: 'e2e-test-category' });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });

  it('POST /api/auth/login rejects invalid credentials', async () => {
    const response = await request(server)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrongpassword' });

    expect(response.status).toBe(401);
  });
});
