import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

jest.setTimeout(20000);

describe('Users E2E', () => {
  let app: INestApplication;
  let server: any;
  let prisma: PrismaClient;
  let userId: string;
  let centerId: string;
  let roleId: string;
  let accessToken: string;
  let inviteEmail: string;
  const uniqueSuffix = Date.now();

  beforeAll(async () => {
    prisma = new PrismaClient();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    server = request(app.getHttpServer());
    // Create test center, role, user with unique names
    const center = await prisma.center.create({
      data: { name: `UsersTestCenter${uniqueSuffix}` },
    });
    centerId = center.id;
    // Fetch seeded 'User' role
    const role = await prisma.role.findUnique({ where: { name: 'User' } });
    if (!role)
      throw new Error("Seeded role 'User' not found. Run the seed script.");
    roleId = role.id;
    const hashedPassword = await bcrypt.hash('Test1234!', 10);
    const user = await prisma.user.create({
      data: {
        email: `user${uniqueSuffix}@ex.com`,
        password: hashedPassword,
        name: 'User Test',
        isActive: true,
      },
    });
    userId = user.id;
    // Assign 'User' role for most tests
    await prisma.userOnCenter.create({ data: { userId, roleId, centerId } });
    // For invite tests, also assign 'Admin' role
    const adminRole = await prisma.role.findUnique({
      where: { name: 'Admin' },
    });
    if (!adminRole)
      throw new Error("Seeded role 'Admin' not found. Run the seed script.");
    await prisma.userOnCenter.create({
      data: { userId, roleId: adminRole.id, centerId },
    });
    // Log in to get JWT
    const loginRes = await server
      .post('/auth/login')
      .send({ email: user.email, password: 'Test1234!' });
    accessToken = loginRes.body.accessToken;
    inviteEmail = `invite${uniqueSuffix}@ex.com`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/users/me (GET) - get profile', async () => {
    const res = await server
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ centerId });
    expect(res.status).toBe(200);
    expect(res.body.email).toBeDefined();
    expect(res.body.id).toBeDefined();
  });

  it('/users/me (GET) - unauthorized', async () => {
    const res = await server.get('/users/me');
    expect(res.status).toBe(401);
  });

  it('/users/me (PUT) - update profile', async () => {
    const res = await server
      .put('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: 'Updated Name', centerId });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
  });

  it('/users/me (PUT) - invalid data', async () => {
    const res = await server
      .put('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: 123, centerId });
    expect(res.status).toBe(400);
  });

  it('/users/me/password (PATCH) - change password', async () => {
    const res = await server
      .patch('/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ oldPassword: 'Test1234!', newPassword: 'NewPass123!', centerId });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Password changed');
  });

  it('/users/me/password (PATCH) - wrong old password', async () => {
    const res = await server
      .patch('/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        oldPassword: 'WrongPass!',
        newPassword: 'AnotherPass123!',
        centerId,
      });
    expect(res.status).toBe(403);
  });

  it('/users/me/password (PATCH) - weak new password', async () => {
    const res = await server
      .patch('/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ oldPassword: 'NewPass123!', newPassword: '123', centerId });
    expect(res.status).toBe(400);
  });
});
