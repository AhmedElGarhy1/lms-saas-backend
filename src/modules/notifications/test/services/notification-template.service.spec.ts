import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplateService } from '../../services/notification-template.service';
import { RedisTemplateCacheService } from '../../adapters/redis-template-cache.service';
import { Logger } from '@nestjs/common';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { createMockLoggerService } from '../helpers';
import { TestEnvGuard } from '../helpers/test-env-guard';
import { TemplateRenderingException } from '../../exceptions/notification.exceptions';
import * as Handlebars from 'handlebars';
import { readFile } from 'fs/promises';

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
  resolveTemplatePathWithFallback: jest
    .fn()
    .mockReturnValue('/mock/template/path.hbs'),
}));

describe('NotificationTemplateService', () => {
  let service: NotificationTemplateService;
  let mockRedisCache: jest.Mocked<RedisTemplateCacheService>;
  let mockLogger: Logger;
  let mockReadFile: jest.MockedFunction<typeof readFile>;
  let mockHandlebarsCompile: jest.MockedFunction<typeof Handlebars.compile>;

  beforeEach(async () => {
    // Ensure test environment
    TestEnvGuard.setupTestEnvironment({ throwOnError: false });

    mockLogger = createMockLoggerService();
    mockRedisCache = {
      getTemplateSource: jest
        .fn()
        .mockImplementation(async (key, loader) => loader()),
      getCompiledTemplate: jest
        .fn()
        .mockImplementation(async (key, loader) => loader()),
      setTemplateSource: jest.fn().mockResolvedValue(undefined),
      clearTemplateCache: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
    mockHandlebarsCompile = Handlebars.compile as jest.MockedFunction<
      typeof Handlebars.compile
    >;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplateService,
        {
          provide: RedisTemplateCacheService,
          useValue: mockRedisCache,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<NotificationTemplateService>(
      NotificationTemplateService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadTemplateWithChannel()', () => {
    it('should load and compile template successfully', async () => {
      const templateContent = '<p>Hello {{name}}</p>';
      mockReadFile.mockResolvedValue(templateContent);
      const compiledTemplate = jest.fn().mockReturnValue('<p>Hello John</p>');
      mockHandlebarsCompile.mockReturnValue(
        compiledTemplate as Handlebars.TemplateDelegate,
      );

      const result = await service.loadTemplateWithChannel(
        'test-template',
        'en',
        NotificationChannel.EMAIL,
      );

      expect(mockRedisCache.getTemplateSource).toHaveBeenCalled();
      expect(mockHandlebarsCompile).toHaveBeenCalledWith(templateContent);
      expect(result).toBeDefined();
    });

    it('should use Redis cache for template source', async () => {
      const templateContent = '<p>Template</p>';
      mockReadFile.mockResolvedValue(templateContent);
      mockHandlebarsCompile.mockReturnValue(jest.fn() as any);

      await service.loadTemplateWithChannel(
        'cached-template',
        'en',
        NotificationChannel.EMAIL,
      );

      expect(mockRedisCache.getTemplateSource).toHaveBeenCalledWith(
        expect.stringContaining('cached-template'),
        expect.any(Function),
      );
    });

    it('should handle template loading errors', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      await expect(
        service.loadTemplateWithChannel(
          'missing-template',
          'en',
          NotificationChannel.EMAIL,
        ),
      ).rejects.toThrow(TemplateRenderingException);
    });
  });

  describe('renderTemplateWithChannel()', () => {
    it('should render template with data', async () => {
      const templateContent = '<p>Hello {{name}}</p>';
      mockReadFile.mockResolvedValue(templateContent);
      const compiledTemplate = jest.fn().mockReturnValue('<p>Hello John</p>');
      mockHandlebarsCompile.mockReturnValue(
        compiledTemplate as Handlebars.TemplateDelegate,
      );

      const result = await service.renderTemplateWithChannel(
        'test-template',
        { name: 'John' },
        'en',
        NotificationChannel.EMAIL,
      );

      expect(result).toBe('<p>Hello John</p>');
      expect(compiledTemplate).toHaveBeenCalledWith({ name: 'John' });
    });

    it('should handle JSON templates for IN_APP channel', async () => {
      const templateContent = JSON.stringify({
        title: '{{title}}',
        message: '{{message}}',
      });
      mockReadFile.mockResolvedValue(templateContent);
      const compiledTemplate = jest.fn().mockReturnValue({
        title: 'Test Title',
        message: 'Test Message',
      });
      mockHandlebarsCompile.mockReturnValue(
        compiledTemplate as Handlebars.TemplateDelegate,
      );

      const result = await service.renderTemplateWithChannel(
        'inapp-template',
        { title: 'Test Title', message: 'Test Message' },
        'en',
        NotificationChannel.IN_APP,
      );

      expect(result).toEqual({
        title: 'Test Title',
        message: 'Test Message',
      });
    });

    it('should validate IN_APP JSON template schema', async () => {
      // IN_APP uses .json extension, so it uses renderJsonTemplate, not Handlebars
      // The template content is JSON with placeholders that get interpolated
      const templateContent = JSON.stringify({
        message: '{{message}}',
        // Missing required 'title' field
      });
      mockReadFile.mockResolvedValue(templateContent);
      // No need to mock Handlebars for IN_APP - it uses JSON template rendering

      await expect(
        service.renderTemplateWithChannel(
          'invalid-inapp-template',
          { message: 'Test Message' },
          'en',
          NotificationChannel.IN_APP,
        ),
      ).rejects.toThrow(TemplateRenderingException);
    });

    it('should handle rendering errors', async () => {
      const templateContent = '<p>{{name}}</p>';
      mockReadFile.mockResolvedValue(templateContent);
      const compiledTemplate = jest.fn().mockImplementation(() => {
        throw new Error('Rendering error');
      });
      mockHandlebarsCompile.mockReturnValue(
        compiledTemplate as Handlebars.TemplateDelegate,
      );

      await expect(
        service.renderTemplateWithChannel(
          'error-template',
          { name: 'John' },
          'en',
          NotificationChannel.EMAIL,
        ),
      ).rejects.toThrow(TemplateRenderingException);
    });
  });

  describe('getTemplatePath()', () => {
    it('should return correct template path', async () => {
      mockReadFile.mockResolvedValue('template content');
      const path = await (service as any).loadTemplateContent(
        'test-template',
        'en',
        NotificationChannel.EMAIL,
      );

      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
    });

    it('should handle different locales', async () => {
      mockReadFile.mockResolvedValue('template content');
      const pathEn = await (service as any).loadTemplateContent(
        'test-template',
        'en',
        NotificationChannel.EMAIL,
      );
      const pathAr = await (service as any).loadTemplateContent(
        'test-template',
        'ar',
        NotificationChannel.EMAIL,
      );

      expect(pathEn).toBeDefined();
      expect(pathAr).toBeDefined();
    });

    it('should handle different channels', async () => {
      mockReadFile.mockResolvedValue('template content');
      const pathEmail = await (service as any).loadTemplateContent(
        'test-template',
        'en',
        NotificationChannel.EMAIL,
      );
      const pathSms = await (service as any).loadTemplateContent(
        'test-template',
        'en',
        NotificationChannel.SMS,
      );

      expect(pathEmail).toBeDefined();
      expect(pathSms).toBeDefined();
    });
  });
});
