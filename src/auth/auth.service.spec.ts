import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../shared/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MailerService } from '../shared/mail/mailer.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: any;
  let mockJwt: any;
  let mockLogger: any;
  let mockMailer: any;

  beforeEach(async () => {
    mockPrisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      emailVerification: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };
    mockJwt = { signAsync: jest.fn() };
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    mockMailer = { sendMail: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
        { provide: MailerService, useValue: mockMailer },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add tests for 2FA, lockout, and edge cases
  describe('login', () => {
    it('should throw if user is locked out', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        password: 'hash',
        lockoutUntil: new Date(Date.now() + 10000),
        failedLoginAttempts: 5,
      });
      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow('Account is temporarily locked');
    });
    it('should throw if 2FA enabled and code missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        password: 'hash',
        twoFactorEnabled: true,
        twoFactorSecret: 'secret',
        failedLoginAttempts: 0,
      });
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);
      await expect(
        service.login({ email: 'test@example.com', password: 'hash' }),
      ).rejects.toThrow('2FA code required');
    });
  });
});
