import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

describe('AccessControl (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let prisma: PrismaClient;
  let userId: string;
  let roleId: string;
  let permissionId: string;
  let centerId: string;
  let accessToken: string;
  const uniqueSuffix = Date.now();

  beforeAll(async () => {
    prisma = new PrismaClient();
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    server = request(app.getHttpServer());
    // Create test center, role, permission, user with unique names
    const center = await prisma.center.create({
      data: { name: `Test Center ${uniqueSuffix}` },
    });
    centerId = center.id;
    // Fetch seeded 'Admin' role
    const role = await prisma.role.findUnique({ where: { name: 'Admin' } });
    if (!role)
      throw new Error("Seeded role 'Admin' not found. Run the seed script.");
    roleId = role.id;
    // Fetch a seeded permission for assignment tests
    const permission = await prisma.permission.findFirst();
    if (!permission)
      throw new Error('No seeded permissions found. Run the seed script.');
    permissionId = permission.id;
    // Create a test user
    const hashedPassword = await bcrypt.hash('Test1234!', 10);
    const user = await prisma.user.create({
      data: {
        email: `ac${uniqueSuffix}@ex.com`,
        password: hashedPassword,
        name: 'AC User',
        isActive: true,
      },
    });
    userId = user.id;
    // Assign seeded 'Admin' role to user in center BEFORE login
    await prisma.userOnCenter.upsert({
      where: { userId_centerId_roleId: { userId, centerId, roleId } },
      update: {},
      create: { userId, roleId, centerId },
    });
    // Log in the test user to get JWT (after assignments)
    const loginRes = await server
      .post('/auth/login')
      .send({ email: user.email, password: 'Test1234!' });
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.userOnCenter.deleteMany({ where: { userId } });
    await prisma.userPermission.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.emailVerification.deleteMany({ where: { userId } });
    // Only delete test-created roles (not seeded ones)
    const seededRoles = ['Admin', 'Owner', 'Teacher', 'Assistant', 'User'];
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (role && !seededRoles.includes(role.name)) {
      await prisma.role.delete({ where: { id: roleId } });
    }
    // Only delete test-created permissions (not seeded ones)
    const seededPerms = [
      'user:view',
      'user:update',
      'user:invite',
      'user:change-password',
      'center:manage',
      'role:manage',
    ];
    const perm = await prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (perm && !seededPerms.includes(perm.name)) {
      await prisma.permission.delete({ where: { id: permissionId } });
    }
    await prisma.center.deleteMany({ where: { id: centerId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('assigns a role to a user in a center', async () => {
    // Use a new role for this test to avoid duplicate assignment
    const uniqueRoleName = `TestRole${Date.now()}`;
    const newRole = await prisma.role.create({
      data: { name: uniqueRoleName },
    });
    const res = await server
      .post('/access-control/assign-role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, roleId: newRole.id, centerId });
    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Role assigned');
    // Cleanup: remove the test role assignment and role
    await prisma.userOnCenter.deleteMany({
      where: { userId, roleId: newRole.id, centerId },
    });
    await prisma.role.delete({ where: { id: newRole.id } });
  });

  it('removes a role from a user in a center', async () => {
    await prisma.userOnCenter.upsert({
      where: { userId_centerId_roleId: { userId, centerId, roleId } },
      update: {},
      create: { userId, roleId, centerId },
    });
    const res = await server
      .delete('/access-control/remove-role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, roleId, centerId });
    expect(res.status).toBe(204);
  });

  it('assigns a permission to a user in a center', async () => {
    const res = await server
      .post('/access-control/assign-permission')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, permissionId, centerId });
    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Permission assigned');
  });

  it('removes a permission from a user in a center', async () => {
    await prisma.userPermission.create({
      data: { userId, permissionId, centerId },
    });
    const res = await server
      .delete('/access-control/remove-permission')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, permissionId, centerId });
    expect(res.status).toBe(204);
  });

  it('assigns a role to a user in a teacher scope', async () => {
    // Create a real teacher user
    const teacher = await prisma.user.create({
      data: {
        email: `teacher${uniqueSuffix}@ex.com`,
        password: await bcrypt.hash('Test1234!', 10),
        name: 'Teacher User',
        isActive: true,
      },
    });
    const teacherRole = await prisma.role.findUnique({
      where: { name: 'Teacher' },
    });
    if (!teacherRole)
      throw new Error("Seeded role 'Teacher' not found. Run the seed script.");
    // Assign teacherRole to userId in teacher scope
    const res = await server
      .post('/access-control/assign-role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userId,
        roleId: teacherRole.id,
        teacherId: teacher.id,
      });
    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Role assigned');
    // Cleanup: remove the teacher user and teacherUser assignment
    await prisma.teacherUser.deleteMany({
      where: { userId, roleId: teacherRole.id, teacherId: teacher.id },
    });
    await prisma.user.delete({ where: { id: teacher.id } });
  });

  it('errors on duplicate role assignment', async () => {
    const teacherRole = await prisma.role.findUnique({
      where: { name: 'Teacher' },
    });
    if (!teacherRole)
      throw new Error("Seeded role 'Teacher' not found. Run the seed script.");
    await prisma.userOnCenter.upsert({
      where: {
        userId_centerId_roleId: { userId, centerId, roleId: teacherRole.id },
      },
      update: {},
      create: { userId, roleId: teacherRole.id, centerId },
    });
    const res = await server
      .post('/access-control/assign-role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, roleId: teacherRole.id, centerId });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already assigned');
  });

  it('errors on removal of non-existent role assignment', async () => {
    const res = await server
      .delete('/access-control/remove-role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, roleId: 'nonexistent', centerId });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('No such role assignment');
  });

  it('errors on missing scope', async () => {
    const teacherRole = await prisma.role.findUnique({
      where: { name: 'Teacher' },
    });
    if (!teacherRole)
      throw new Error("Seeded role 'Teacher' not found. Run the seed script.");
    const res = await server
      .post('/access-control/assign-role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, roleId: teacherRole.id });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Scope');
  });

  it('assigns a permission to a user in a teacher scope', async () => {
    const perm = await prisma.permission.findFirst();
    if (!perm)
      throw new Error('No seeded permissions found. Run the seed script.');
    const res = await server
      .post('/access-control/assign-permission')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, permissionId: perm.id, teacherId: userId });
    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Permission assigned');
  });

  it('errors on duplicate permission assignment', async () => {
    const perm = await prisma.permission.findFirst();
    if (!perm)
      throw new Error('No seeded permissions found. Run the seed script.');
    await prisma.userPermission.create({
      data: { userId, permissionId: perm.id, centerId },
    });
    const res = await server
      .post('/access-control/assign-permission')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, permissionId: perm.id, centerId });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already assigned');
  });

  it('errors on removal of non-existent permission assignment', async () => {
    const res = await server
      .delete('/access-control/remove-permission')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, permissionId: 'nonexistent', centerId });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('No such user permission');
  });

  it('errors on missing userId/roleId in permission assignment', async () => {
    const perm = await prisma.permission.findFirst();
    if (!perm)
      throw new Error('No seeded permissions found. Run the seed script.');
    const res = await server
      .post('/access-control/assign-permission')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ permissionId: perm.id, centerId });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('userId or roleId is required');
  });

  // Add more tests for guard-protected endpoints, ownership logic, and ambiguous scope as needed
});
