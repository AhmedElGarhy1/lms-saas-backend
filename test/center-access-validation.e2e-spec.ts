import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma.service';

describe('Center Access Validation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let centerDeactivatedUserToken: string;
  let testCenterId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Login as admin
    const adminResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@lms.com',
        password: 'password123',
      });

    adminToken = adminResponse.body.access_token;

    // Login as center-deactivated user
    const centerDeactivatedResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'center-deactivated@lms.com',
        password: 'password123',
      });

    centerDeactivatedUserToken = centerDeactivatedResponse.body.access_token;

    // Get a test center ID
    const centersResponse = await request(app.getHttpServer())
      .get('/centers')
      .set('Authorization', `Bearer ${adminToken}`);

    testCenterId = centersResponse.body.data[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Center Access Validation', () => {
    it('should allow admin to access any center', async () => {
      const response = await request(app.getHttpServer())
        .get(`/centers/${testCenterId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-scope-type', 'CENTER')
        .set('x-scope-id', testCenterId);

      expect(response.status).toBe(200);
    });

    it('should deny center-deactivated user access to deactivated center', async () => {
      // Find the center where center-deactivated user is deactivated
      const userOnCenter = await prisma.userOnCenter.findFirst({
        where: {
          user: {
            email: 'center-deactivated@lms.com',
          },
          isActive: false,
        },
        include: {
          center: true,
        },
      });

      if (userOnCenter) {
        const response = await request(app.getHttpServer())
          .get(`/centers/${userOnCenter.centerId}/members`)
          .set('Authorization', `Bearer ${centerDeactivatedUserToken}`)
          .set('x-scope-type', 'CENTER')
          .set('x-scope-id', userOnCenter.centerId);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
          'User is deactivated in this center',
        );
      }
    });

    it('should allow center-deactivated user access to active center', async () => {
      // Find the center where center-deactivated user is active
      const userOnCenter = await prisma.userOnCenter.findFirst({
        where: {
          user: {
            email: 'center-deactivated@lms.com',
          },
          isActive: true,
        },
        include: {
          center: true,
        },
      });

      if (userOnCenter) {
        const response = await request(app.getHttpServer())
          .get(`/centers/${userOnCenter.centerId}/members`)
          .set('Authorization', `Bearer ${centerDeactivatedUserToken}`)
          .set('x-scope-type', 'CENTER')
          .set('x-scope-id', userOnCenter.centerId);

        expect(response.status).toBe(200);
      }
    });

    it('should deny globally deactivated user login', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'deactivated@lms.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        'Account is deactivated. Please contact administrator.',
      );
    });
  });
});
