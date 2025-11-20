import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Results (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let matchId: string;

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
    app.setGlobalPrefix('api/v1');

    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    // Register and login to get token
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'results@example.com',
        password: 'password123',
        firstName: 'Results',
        lastName: 'User',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'results@example.com',
        password: 'password123',
      });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/results', () => {
    it('should reject score submission without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/results')
        .send({
          matchId: 'test-match',
          score: '6-4 6-3',
        })
        .expect(401);
    });

    it('should validate score format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/results')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          matchId: 'test-match',
          score: 'invalid-score',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/results/matches/:matchId', () => {
    it('should return null for non-existent match', () => {
      return request(app.getHttpServer())
        .get('/api/v1/results/matches/non-existent')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeNull();
        });
    });
  });
});

