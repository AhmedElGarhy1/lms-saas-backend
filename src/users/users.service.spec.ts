import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../shared/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MailerService } from '../shared/mail/mailer.service';

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
});
