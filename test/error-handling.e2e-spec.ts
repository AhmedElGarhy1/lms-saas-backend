import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Error Handling (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toBe('Validation failed');
          expect(res.body.errors).toBeDefined();
        });
    });

    it('should return 400 for missing required fields', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          // missing password and name
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toBe('Validation failed');
          expect(res.body.errors).toBeDefined();
        });
    });

    it('should return 400 for invalid center data', () => {
      return request(app.getHttpServer())
        .post('/centers')
        .send({
          name: 'A', // too short
          email: 'invalid-email',
          website: 'not-a-url',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toBe('Validation failed');
          expect(res.body.errors).toBeDefined();
        });
    });
  });

  describe('Authentication Errors', () => {
    it('should return 401 for unauthorized access', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(401)
        .expect((res) => {
          expect(res.body.statusCode).toBe(401);
          expect(res.body.message).toBe('Unauthorized');
        });
    });

    it('should return 401 for invalid token', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
        .expect((res) => {
          expect(res.body.statusCode).toBe(401);
          expect(res.body.message).toBe('Unauthorized');
        });
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 for non-existent endpoint', () => {
      return request(app.getHttpServer())
        .get('/non-existent-endpoint')
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.message).toBe('Cannot GET /non-existent-endpoint');
        });
    });

    it('should return 404 for non-existent resource', () => {
      return request(app.getHttpServer())
        .get('/users/non-existent-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.message).toBe(
            "User with ID 'non-existent-id' not found",
          );
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 for too many requests', async () => {
      const requests = Array(15)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/health').expect(429));

      await Promise.all(requests);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error response format', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'short',
          name: 'A',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode');
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('error');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('path');
          expect(res.body).toHaveProperty('method');
          expect(res.body).toHaveProperty('errors');
        });
    });
  });
});
