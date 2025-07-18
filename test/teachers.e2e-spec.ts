import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Teachers (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  let adminToken: string;
  let teacherToken: string;
  let regularUserToken: string;
  let adminUser: any;
  let teacherUser: any;
  let regularUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create test users with unique emails
    const timestamp = Date.now();
    adminUser = await prismaService.user.create({
      data: {
        email: `admin${timestamp}@test.com`,
        password: 'hashedPassword',
        name: 'Admin User',
      },
    });

    teacherUser = await prismaService.user.create({
      data: {
        email: `teacher${timestamp}@test.com`,
        password: 'hashedPassword',
        name: 'Teacher User',
      },
    });

    regularUser = await prismaService.user.create({
      data: {
        email: `user${timestamp}@test.com`,
        password: 'hashedPassword',
        name: 'Regular User',
      },
    });

    // Create admin role and assign to admin user
    const adminRole = await prismaService.role.create({
      data: {
        name: 'admin',
        scope: 'GLOBAL',
      },
    });

    await prismaService.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
        scopeType: 'GLOBAL',
      },
    });

    // Create teacher role and assign to teacher user
    const teacherRole = await prismaService.role.create({
      data: {
        name: 'teacher',
        scope: 'GLOBAL',
      },
    });

    await prismaService.userRole.create({
      data: {
        userId: teacherUser.id,
        roleId: teacherRole.id,
        scopeType: 'GLOBAL',
      },
    });

    // Generate JWT tokens
    adminToken = jwtService.sign({ sub: adminUser.id, email: adminUser.email });
    teacherToken = jwtService.sign({
      sub: teacherUser.id,
      email: teacherUser.email,
    });
    regularUserToken = jwtService.sign({
      sub: regularUser.id,
      email: regularUser.email,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.teacher.deleteMany();
    await prismaService.userRole.deleteMany();
    await prismaService.role.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up any existing teacher profiles before each test
    await prismaService.teacher.deleteMany();
  });

  describe('/teachers (POST)', () => {
    it('should create a teacher profile (admin)', () => {
      return request(app.getHttpServer())
        .post('/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: teacherUser.id,
          biography: 'Experienced mathematics teacher',
          experienceYears: 5,
          specialization: 'Mathematics',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.userId).toBe(teacherUser.id);
          expect(res.body.biography).toBe('Experienced mathematics teacher');
          expect(res.body.experienceYears).toBe(5);
          expect(res.body.specialization).toBe('Mathematics');
          expect(res.body.profileViews).toBe(0);
          expect(res.body.rating).toBe(0);
        });
    });

    it('should return 409 if teacher profile already exists', async () => {
      // First create the teacher profile
      await request(app.getHttpServer())
        .post('/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: regularUser.id,
          biography: 'Another teacher',
          experienceYears: 3,
          specialization: 'Science',
        });

      // Try to create again
      return request(app.getHttpServer())
        .post('/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: regularUser.id,
          biography: 'Another teacher',
          experienceYears: 3,
          specialization: 'Science',
        })
        .expect(409);
    });

    it('should return 404 if user does not exist', () => {
      return request(app.getHttpServer())
        .post('/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'non-existent-user-id',
          biography: 'Test teacher',
          experienceYears: 2,
          specialization: 'English',
        })
        .expect(404);
    });
  });

  describe('/teachers/:id (GET)', () => {
    let teacherId: string;

    beforeEach(async () => {
      // Create a teacher profile for testing
      const teacher = await prismaService.teacher.create({
        data: {
          userId: teacherUser.id,
          biography: 'Test teacher biography',
          experienceYears: 4,
          specialization: 'Physics',
        },
      });
      teacherId = teacher.id;
    });

    it('should get teacher profile by ID (admin)', () => {
      return request(app.getHttpServer())
        .get(`/teachers/${teacherId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(teacherId);
          expect(res.body.userId).toBe(teacherUser.id);
          expect(res.body.biography).toBe('Test teacher biography');
        });
    });

    it('should get teacher profile by ID (teacher accessing own profile)', () => {
      return request(app.getHttpServer())
        .get(`/teachers/${teacherId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(teacherId);
          expect(res.body.userId).toBe(teacherUser.id);
        });
    });

    it('should return 403 if regular user tries to access teacher profile', () => {
      return request(app.getHttpServer())
        .get(`/teachers/${teacherId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it('should return 404 if teacher not found', () => {
      return request(app.getHttpServer())
        .get('/teachers/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('/teachers/user/:userId (GET)', () => {
    beforeEach(async () => {
      // Create a teacher profile for testing
      await prismaService.teacher.create({
        data: {
          userId: teacherUser.id,
          biography: 'Test teacher biography',
          experienceYears: 4,
          specialization: 'Physics',
        },
      });
    });

    it('should get teacher profile by user ID (admin)', () => {
      return request(app.getHttpServer())
        .get(`/teachers/user/${teacherUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.userId).toBe(teacherUser.id);
        });
    });

    it('should get teacher profile by user ID (teacher accessing own profile)', () => {
      return request(app.getHttpServer())
        .get(`/teachers/user/${teacherUser.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.userId).toBe(teacherUser.id);
        });
    });

    it('should return 404 if teacher not found for user ID', () => {
      return request(app.getHttpServer())
        .get(`/teachers/user/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('/teachers/:id (PUT)', () => {
    let teacherId: string;

    beforeEach(async () => {
      // Create a teacher profile for testing updates
      const teacher = await prismaService.teacher.create({
        data: {
          userId: regularUser.id,
          biography: 'Original biography',
          experienceYears: 2,
          specialization: 'Chemistry',
        },
      });
      teacherId = teacher.id;
    });

    it('should update teacher profile (admin)', () => {
      return request(app.getHttpServer())
        .put(`/teachers/${teacherId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          biography: 'Updated biography',
          experienceYears: 3,
          specialization: 'Advanced Chemistry',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.biography).toBe('Updated biography');
          expect(res.body.experienceYears).toBe(3);
          expect(res.body.specialization).toBe('Advanced Chemistry');
        });
    });

    it('should return 404 if teacher not found', () => {
      return request(app.getHttpServer())
        .put('/teachers/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          biography: 'Test update',
        })
        .expect(404);
    });
  });

  describe('/teachers (GET)', () => {
    beforeEach(async () => {
      // Create some teacher profiles for testing
      await prismaService.teacher.create({
        data: {
          userId: teacherUser.id,
          biography: 'Test teacher 1',
          experienceYears: 3,
          specialization: 'Math',
        },
      });
      await prismaService.teacher.create({
        data: {
          userId: regularUser.id,
          biography: 'Test teacher 2',
          experienceYears: 5,
          specialization: 'Science',
        },
      });
    });

    it('should get all teachers (admin)', () => {
      return request(app.getHttpServer())
        .get('/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('teachers');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(Array.isArray(res.body.teachers)).toBe(true);
        });
    });

    it('should return 403 if regular user tries to get all teachers', () => {
      return request(app.getHttpServer())
        .get('/teachers')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/teachers?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(5);
        });
    });
  });

  describe('/teachers/:id/views (POST)', () => {
    let teacherId: string;

    beforeEach(async () => {
      // Create a teacher profile for testing views
      const teacher = await prismaService.teacher.create({
        data: {
          userId: regularUser.id,
          biography: 'Test teacher for views',
          experienceYears: 1,
          specialization: 'Biology',
          profileViews: 5,
        },
      });
      teacherId = teacher.id;
    });

    it('should increment profile views', () => {
      return request(app.getHttpServer())
        .post(`/teachers/${teacherId}/views`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.profileViews).toBe(6);
        });
    });

    it('should return 404 if teacher not found', () => {
      return request(app.getHttpServer())
        .post('/teachers/non-existent-id/views')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('/teachers/:id (DELETE)', () => {
    let teacherId: string;

    beforeEach(async () => {
      // Create a teacher profile for testing deletion
      const teacher = await prismaService.teacher.create({
        data: {
          userId: regularUser.id,
          biography: 'Teacher to be deleted',
          experienceYears: 1,
          specialization: 'History',
        },
      });
      teacherId = teacher.id;
    });

    it('should delete teacher profile (admin)', () => {
      return request(app.getHttpServer())
        .delete(`/teachers/${teacherId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should return 404 if teacher not found', () => {
      return request(app.getHttpServer())
        .delete('/teachers/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 if regular user tries to delete teacher profile', () => {
      return request(app.getHttpServer())
        .delete(`/teachers/${teacherId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });
  });
});
