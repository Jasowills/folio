import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';
import { StorageService } from '../src/modules/storage/storage.service';
import { AiService } from '../src/modules/ai/ai.service';
import { User } from '../src/modules/users/schemas/user.schema';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

jest.setTimeout(30000);

describe('Folio API (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = `${mongod.getUri()}folio-test`;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue({
        upload: jest.fn().mockResolvedValue({
          publicId: 'test-file',
          url: 'https://res.cloudinary.com/test/image/upload/test-file',
        }),
        delete: jest.fn().mockResolvedValue(undefined),
      })
      .overrideProvider(AiService)
      .useValue({
        chat: jest.fn().mockResolvedValue({}),
        stream: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseTransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    await moduleFixture.get(getModelToken(User.name)).create({
      _id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      name: 'Test User',
    });
  }, 30000);

  afterAll(async () => {
    await app.close();
    if (mongod) await mongod.stop();
  });

  function authHeader(): string {
    const token = jwt.sign(
      { sub: '507f1f77bcf86cd799439011', email: 'test@example.com' },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' },
    );
    return `Bearer ${token}`;
  }

  describe('Response format', () => {
    it('returns 404 with success:false for unknown routes', () => {
      return request(app.getHttpServer())
        .get('/api/nonexistent')
        .expect(404)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 404,
          });
        });
    });

    it('returns 401 for protected routes without token', () => {
      return request(app.getHttpServer())
        .get('/api/upload')
        .expect(401)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 401,
          });
        });
    });

    it('returns 401 for protected POST routes without token', () => {
      return request(app.getHttpServer())
        .post('/api/resumes')
        .expect(401)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 401,
          });
        });
    });
  });

  describe('Auth endpoints', () => {
    it('returns 401 for token refresh without cookie', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .expect(401);
    });

    it('returns 401 for logout without token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);
    });
  });

  describe('Validation', () => {
    it('returns 400 for missing url on crawler analyze', () => {
      return request(app.getHttpServer())
        .post('/api/crawler/analyze')
        .set('Authorization', authHeader())
        .send({})
        .expect(400);
    });
  });
});
