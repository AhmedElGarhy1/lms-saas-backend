import { Test as NestTest } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MailerService } from '../src/shared/mail/mailer.service';
import { PrismaClient } from '@prisma/client';
import * as speakeasy from 'speakeasy';

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

  // Add stubs for 2FA and lockout E2E tests
  it('/auth/login (POST) - account lockout', async () => {
    // Simulate 5 failed logins to trigger lockout
    for (let i = 0; i < 5; i++) {
      await server
        .post('/auth/login')
        .send({ email: testEmail, password: 'wrongpass' });
    }
    const res = await server
      .post('/auth/login')
      .send({ email: testEmail, password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('locked');
  });
  // 2FA E2E test stub (implement when endpoint is available)
  it('/auth/login (POST) - 2FA required', async () => {
    // 1. Sign up and verify user
    const email = `2fa${Date.now()}@example.com`;
    const password = 'Test2FA123!';
    const fullName = '2FA User';
    await server.post('/auth/signup').send({ email, password, fullName });
    // Get verification token
    const prisma = new PrismaClient();
    const verification = await prisma.emailVerification.findFirst({
      where: { user: { email } },
      orderBy: { createdAt: 'desc' },
    });
    await server
      .post('/auth/verify-email')
      .send({ token: verification?.token });
    // 2. Login to get JWT
    const loginRes = await server.post('/auth/login').send({ email, password });
    const jwt = loginRes.body.accessToken;
    // 3. Setup 2FA
    const setupRes = await server
      .post('/auth/2fa/setup')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ password });
    const secret = setupRes.body.secret;
    // 4. Generate TOTP code
    const code = speakeasy.totp({ secret, encoding: 'base32' });
    // 5. Enable 2FA
    await server
      .post('/auth/2fa/enable')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ code });
    // 6. Try login without code (should fail with 2FA required)
    const resNoCode = await server
      .post('/auth/login')
      .send({ email, password });
    expect(resNoCode.status).toBe(401);
    expect(resNoCode.body.message).toContain('2FA code required');
    // 7. Try login with correct code (should succeed)
    const resWithCode = await server
      .post('/auth/login')
      .send({ email, password, code });
    expect(resWithCode.status).toBe(201);
    expect(resWithCode.body.accessToken).toBeDefined();
    await prisma.$disconnect();
  });
});
