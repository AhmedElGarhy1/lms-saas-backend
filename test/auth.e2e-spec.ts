import { Test as NestTest } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MailerService } from '../src/shared/mailer.service';
import { PrismaClient } from '@prisma/client';

interface EmailVerificationResult {
  token: string;
}
interface PasswordResetTokenResult {
  token: string;
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<typeof request>;
  let accessToken: string;
  let refreshToken: string;
  let verificationToken: string;
  let resetToken: string;
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'Test1234!';
  const testName = 'Test User';

  beforeAll(async () => {
    const moduleFixture = await NestTest.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailerService)
      .useValue({ sendMail: jest.fn().mockResolvedValue(true) })
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    server = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/signup (POST) - success', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const res: request.Response = await server
      .post('/auth/signup')
      .send({ email: testEmail, password: testPassword, fullName: testName });
    const body: { message?: string } = res.body;
    expect(res.status).toBe(201);
    expect(body.message).toContain('Signup successful');
    // Get verification token from DB
    const prisma = new PrismaClient();
    const verification = (await prisma.emailVerification.findFirst({
      where: {},
      orderBy: { createdAt: 'desc' },
    })) as EmailVerificationResult | null;
    verificationToken = verification?.token || '';
    await prisma.$disconnect();
  });

  it('/auth/signup (POST) - duplicate email', async () => {
    const res: request.Response = await server
      .post('/auth/signup')
      .send({ email: testEmail, password: testPassword, fullName: testName });
    expect(res.status).toBe(400);
  });

  it('/auth/login (POST) - success', async () => {
    const res: request.Response = await server
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword });
    const body: { accessToken?: string; refreshToken?: string } = res.body;
    expect(res.status).toBe(201);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    accessToken = body.accessToken!;
    refreshToken = body.refreshToken!;
  });

  it('/auth/login (POST) - wrong password', async () => {
    const res: request.Response = await server
      .post('/auth/login')
      .send({ email: testEmail, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('/auth/refresh-token (POST) - success', async () => {
    const res: request.Response = await server
      .post('/auth/refresh-token')
      .send({ refreshToken });
    const body: { accessToken?: string; refreshToken?: string } = res.body;
    expect(res.status).toBe(201);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it('/auth/refresh-token (POST) - invalid token', async () => {
    const res: request.Response = await server
      .post('/auth/refresh-token')
      .send({ refreshToken: 'invalidtoken' });
    expect(res.status).toBe(401);
  });

  it('/auth/logout (POST) - success', async () => {
    const res: request.Response = await server
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();
    const body: { message?: string } = res.body;
    expect(res.status).toBe(201);
    expect(body.message).toBe('Logged out');
  });

  it('/auth/verify-email (POST) - success', async () => {
    const res: request.Response = await server
      .post('/auth/verify-email')
      .send({ token: verificationToken });
    const body: { message?: string } = res.body;
    expect(res.status).toBe(201);
    expect(body.message).toBe('Email verified successfully');
  });

  it('/auth/verify-email (POST) - invalid token', async () => {
    const res: request.Response = await server
      .post('/auth/verify-email')
      .send({ token: 'invalidtoken' });
    expect(res.status).toBe(400);
  });

  it('/auth/forgot-password (POST) - success', async () => {
    const res: request.Response = await server
      .post('/auth/forgot-password')
      .send({ email: testEmail });
    const body: { message?: string } = res.body;
    expect(res.status).toBe(201);
    expect(body.message).toContain('reset link has been sent');
    // Get reset token from DB
    const prisma = new PrismaClient();
    const reset = (await prisma.passwordResetToken.findFirst({
      where: {},
      orderBy: { createdAt: 'desc' },
    })) as PasswordResetTokenResult | null;
    resetToken = reset?.token || '';
    await prisma.$disconnect();
  });

  it('/auth/reset-password (POST) - success', async () => {
    const res: request.Response = await server
      .post('/auth/reset-password')
      .send({ token: resetToken, newPassword: 'NewPass123!' });
    const body: { message?: string } = res.body;
    expect(res.status).toBe(201);
    expect(body.message).toBe('Password reset successful');
  });

  it('/auth/reset-password (POST) - invalid token', async () => {
    const res: request.Response = await server
      .post('/auth/reset-password')
      .send({ token: 'invalidtoken', newPassword: 'NewPass123!' });
    expect(res.status).toBe(400);
  });
});
