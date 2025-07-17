import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../shared/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MailerService } from '../shared/mail/mailer.service';
import { BadRequestException } from '@nestjs/common';
import { InviteUserDto } from './dto/invite-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: any;
  let mockMailer: any;
  let mockLogger: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      inviteToken: {
        create: jest.fn(),
      },
    };
    mockMailer = { sendMail: jest.fn() };
    mockLogger = { log: jest.fn(), warn: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
        { provide: MailerService, useValue: mockMailer },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('inviteUser', () => {
    it('should throw if user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      await expect(
        service.inviteUser({ email: 'test@example.com', fullName: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create user, token, and send mail', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: '2',
        email: 'test@example.com',
        name: 'Test',
      });
      mockPrisma.inviteToken.create.mockResolvedValue({});
      const dto: InviteUserDto = {
        email: 'test@example.com',
        fullName: 'Test',
      };
      await service.inviteUser(dto);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.inviteToken.create).toHaveBeenCalled();
      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        dto.email,
        expect.stringContaining('invited'),
        expect.stringContaining('accept-invite'),
      );
    });
  });

  describe('acceptInvite', () => {
    it('should throw if invite token is invalid', async () => {
      mockPrisma.inviteToken = {
        findUnique: jest.fn().mockResolvedValue(null),
      };
      await expect(service.acceptInvite('badtoken', 'pass')).rejects.toThrow(
        'Invalid or expired invite token',
      );
    });
    it('should throw if invite token is expired', async () => {
      mockPrisma.inviteToken = {
        findUnique: jest.fn().mockResolvedValue({
          expiresAt: new Date(Date.now() - 1000),
          user: { isActive: false },
        }),
      };
      await expect(service.acceptInvite('token', 'pass')).rejects.toThrow(
        'Invite token has expired',
      );
    });
    it('should throw if user is already active', async () => {
      mockPrisma.inviteToken = {
        findUnique: jest.fn().mockResolvedValue({
          expiresAt: new Date(Date.now() + 1000),
          user: { isActive: true },
        }),
      };
      await expect(service.acceptInvite('token', 'pass')).rejects.toThrow(
        'User is already active',
      );
    });
    it('should accept invite and activate user', async () => {
      const invite = {
        token: 'token',
        expiresAt: new Date(Date.now() + 1000),
        user: { isActive: false, name: 'Test', email: 'test@example.com' },
        userId: 'uid',
      };
      mockPrisma.inviteToken = {
        findUnique: jest.fn().mockResolvedValue(invite),
      };
      mockPrisma.$transaction = jest
        .fn()
        .mockImplementation((cb) => cb(mockPrisma));
      mockPrisma.user = { update: jest.fn() };
      mockPrisma.inviteToken.delete = jest.fn();
      jest.spyOn(require('bcrypt'), 'hash').mockResolvedValue('hashed');
      const result = await service.acceptInvite('token', 'pass', 'New Name');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'uid' },
        data: { password: 'hashed', isActive: true, name: 'New Name' },
      });
      expect(mockPrisma.inviteToken.delete).toHaveBeenCalledWith({
        where: { token: 'token' },
      });
      expect(result.message).toContain('Invite accepted');
    });
  });
});
