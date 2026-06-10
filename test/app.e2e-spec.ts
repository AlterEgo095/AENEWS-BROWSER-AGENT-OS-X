import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('/api/info (GET)', () => {
    it('should return application information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/info',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe('AENEWS-Agent-OS-X');
      expect(body.data.version).toBeDefined();
      expect(body.data.environment).toBeDefined();
      expect(body.data.timestamp).toBeDefined();
    });
  });

  describe('/api/status (GET)', () => {
    it('should return application status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/status',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ok');
      expect(body.data.timestamp).toBeDefined();
    });
  });

  describe('/health/live (GET)', () => {
    it('should return liveness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('ok');
    });
  });

  describe('/health (GET)', () => {
    it('should return health check result', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBeDefined();
    });
  });
});
