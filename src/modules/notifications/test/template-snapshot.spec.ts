import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplateService } from '../services/notification-template.service';
import { RedisTemplateCacheService } from '../services/redis-template-cache.service';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { createMockLoggerService } from './helpers';
import { TestEnvGuard } from './helpers/test-env-guard';
import { readFile } from 'fs/promises';
import * as Handlebars from 'handlebars';
import * as templatePathUtil from '../utils/template-path.util';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

// Mock Handlebars
jest.mock('handlebars', () => ({
  compile: jest.fn(),
}));

// Mock template path utility
jest.mock('../utils/template-path.util', () => ({
  resolveTemplatePathWithFallback: jest.fn().mockReturnValue('/mock/path/to/template.hbs'),
}));

describe('Template Snapshot Tests', () => {
  let service: NotificationTemplateService;
  let mockRedisCache: jest.Mocked<RedisTemplateCacheService>;
  let mockLogger: LoggerService;
  let mockReadFile: jest.MockedFunction<typeof readFile>;
  let mockHandlebarsCompile: jest.MockedFunction<typeof Handlebars.compile>;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockLogger = createMockLoggerService();
    mockRedisCache = {
      getTemplateSource: jest.fn().mockImplementation(async (key, loader) => loader()),
      getCompiledTemplate: jest.fn().mockImplementation(async (key, loader) => loader()),
      setTemplateSource: jest.fn().mockResolvedValue(undefined),
      clearTemplateCache: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<RedisTemplateCacheService>;

    mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
    mockHandlebarsCompile = Handlebars.compile as jest.MockedFunction<typeof Handlebars.compile>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplateService,
        {
          provide: RedisTemplateCacheService,
          useValue: mockRedisCache,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<NotificationTemplateService>(NotificationTemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Template Snapshots', () => {
    it('should render email template with consistent output', async () => {
      const templateContent = `
        <h1>Welcome, {{name}}!</h1>
        <p>Your verification code is: <strong>{{otpCode}}</strong></p>
        <p>This code expires in {{expiresIn}} minutes.</p>
      `;
      mockReadFile.mockResolvedValue(templateContent);
      const compiledTemplate = jest.fn().mockReturnValue(`
        <h1>Welcome, John Doe!</h1>
        <p>Your verification code is: <strong>123456</strong></p>
        <p>This code expires in 10 minutes.</p>
      `);
      mockHandlebarsCompile.mockReturnValue(compiledTemplate as Handlebars.TemplateDelegate);

      const result = await service.renderTemplateWithChannel(
        'welcome-email',
        { name: 'John Doe', otpCode: '123456', expiresIn: 10 },
        'en',
        NotificationChannel.EMAIL,
      );

      // Snapshot test - ensures template output doesn't change unexpectedly
      expect(result).toMatchSnapshot();
    });

    it('should handle email template with complex data', async () => {
      const templateContent = `
        <div>
          <h2>{{centerName}} - New Notification</h2>
          <p>Created by: {{creatorName}}</p>
          <p>Owner: {{ownerName}}</p>
          <ul>
            {{#each items}}
            <li>{{this}}</li>
            {{/each}}
          </ul>
        </div>
      `;
      mockReadFile.mockResolvedValue(templateContent);
      const compiledTemplate = jest.fn().mockReturnValue(`
        <div>
          <h2>Test Center - New Notification</h2>
          <p>Created by: Admin User</p>
          <p>Owner: Owner User</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `);
      mockHandlebarsCompile.mockReturnValue(compiledTemplate as Handlebars.TemplateDelegate);

      const result = await service.renderTemplateWithChannel(
        'complex-email',
        {
          centerName: 'Test Center',
          creatorName: 'Admin User',
          ownerName: 'Owner User',
          items: ['Item 1', 'Item 2'],
        },
        'en',
        NotificationChannel.EMAIL,
      );

      expect(result).toMatchSnapshot();
    });
  });

  describe('SMS Template Snapshots', () => {
    it('should render SMS template with consistent output', async () => {
      const templateContent = 'Hello {{name}}, your OTP is {{otpCode}}. Expires in {{expiresIn}} minutes.';
      mockReadFile.mockResolvedValue(templateContent);
      const compiledTemplate = jest.fn().mockReturnValue(
        'Hello John Doe, your OTP is 123456. Expires in 10 minutes.',
      );
      mockHandlebarsCompile.mockReturnValue(compiledTemplate as Handlebars.TemplateDelegate);

      const result = await service.renderTemplateWithChannel(
        'otp-sms',
        { name: 'John Doe', otpCode: '123456', expiresIn: 10 },
        'en',
        NotificationChannel.SMS,
      );

      expect(result).toMatchSnapshot();
    });
  });

  describe('In-App JSON Template Snapshots', () => {
    it('should render IN_APP JSON template with consistent structure', async () => {
      const templateContent = JSON.stringify({
        title: '{{title}}',
        message: '{{message}}',
        expiresAt: '{{expiresAt}}',
      });
      mockReadFile.mockResolvedValue(templateContent);
      const compiledTemplate = jest.fn().mockReturnValue({
        title: 'New Notification',
        message: 'You have a new notification',
        expiresAt: '2024-12-31T23:59:59Z',
      });
      mockHandlebarsCompile.mockReturnValue(compiledTemplate as Handlebars.TemplateDelegate);

      const result = await service.renderTemplateWithChannel(
        'inapp-notification',
        {
          title: 'New Notification',
          message: 'You have a new notification',
          expiresAt: '2024-12-31T23:59:59Z',
        },
        'en',
        NotificationChannel.IN_APP,
      );

      expect(result).toMatchSnapshot();
    });

    it('should validate IN_APP JSON schema matches snapshot', async () => {
      const templateContent = JSON.stringify({
        title: '{{title}}',
        message: '{{message}}',
      });
      mockReadFile.mockResolvedValue(templateContent);
      const compiledTemplate = jest.fn().mockReturnValue({
        title: 'Test Title',
        message: 'Test Message',
      });
      mockHandlebarsCompile.mockReturnValue(compiledTemplate as Handlebars.TemplateDelegate);

      const result = await service.renderTemplateWithChannel(
        'inapp-simple',
        { title: 'Test Title', message: 'Test Message' },
        'en',
        NotificationChannel.IN_APP,
      );

      // Snapshot ensures schema structure doesn't change
      expect(result).toMatchSnapshot();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('message');
    });
  });

  describe('Multi-locale Template Snapshots', () => {
    it('should render English template correctly', async () => {
      const templateContent = 'Hello {{name}}, welcome!';
      mockReadFile.mockResolvedValue(templateContent);
      const compiledTemplate = jest.fn().mockReturnValue('Hello John, welcome!');
      mockHandlebarsCompile.mockReturnValue(compiledTemplate as Handlebars.TemplateDelegate);

      const result = await service.renderTemplateWithChannel(
        'welcome',
        { name: 'John' },
        'en',
        NotificationChannel.EMAIL,
      );

      expect(result).toMatchSnapshot();
    });

    it('should render Arabic template correctly', async () => {
      const templateContent = 'مرحبا {{name}}، أهلا بك!';
      mockReadFile.mockResolvedValue(templateContent);
      const compiledTemplate = jest.fn().mockReturnValue('مرحبا جون، أهلا بك!');
      mockHandlebarsCompile.mockReturnValue(compiledTemplate as Handlebars.TemplateDelegate);

      const result = await service.renderTemplateWithChannel(
        'welcome',
        { name: 'جون' },
        'ar',
        NotificationChannel.EMAIL,
      );

      expect(result).toMatchSnapshot();
    });
  });
});


