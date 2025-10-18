import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AdvancedI18nService } from '../src/shared/services/advanced-i18n.service';

describe('I18n System (e2e)', () => {
  let app: INestApplication;
  let advancedI18nService: AdvancedI18nService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    advancedI18nService = moduleFixture.get<AdvancedI18nService>(AdvancedI18nService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/locale (GET)', () => {
    it('should return English translations by default', () => {
      return request(app.getHttpServer())
        .get('/locale')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeDefined();
          expect(res.body.data.common).toBeDefined();
          expect(res.body.data.common.buttons.save).toBe('Save');
        });
    });

    it('should return Arabic translations when lang=ar', () => {
      return request(app.getHttpServer())
        .get('/locale?lang=ar')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeDefined();
          expect(res.body.data.common).toBeDefined();
          expect(res.body.data.common.buttons.save).toBe('حفظ');
        });
    });

    it('should return user locale when authenticated', () => {
      // This would require authentication setup
      return request(app.getHttpServer())
        .get('/locale/me')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeDefined();
        });
    });

    it('should return available languages', () => {
      return request(app.getHttpServer())
        .get('/locale/languages')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toEqual(['en', 'ar']);
        });
    });
  });

  describe('Advanced I18n Features', () => {
    it('should handle pluralization correctly', () => {
      const result1 = advancedI18nService.translatePlural('common.messages.itemCount', 0);
      const result2 = advancedI18nService.translatePlural('common.messages.itemCount', 1);
      const result3 = advancedI18nService.translatePlural('common.messages.itemCount', 5);

      expect(result1).toContain('No items');
      expect(result2).toContain('One item');
      expect(result3).toContain('5 items');
    });

    it('should format numbers with locale', () => {
      const result = advancedI18nService.formatNumber(1234.56);
      expect(result).toBe('1,234.56');
    });

    it('should format currency with locale', () => {
      const result = advancedI18nService.formatCurrency(1234.56, 'USD');
      expect(result).toContain('$1,234.56');
    });

    it('should format dates with locale', () => {
      const date = new Date('2023-12-25');
      const result = advancedI18nService.formatDate(date);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle variable substitution', () => {
      const result = advancedI18nService.translate('common.messages.welcome', {
        args: { name: 'John' }
      });
      expect(result).toBe('Welcome, John!');
    });
  });

  describe('Language Support', () => {
    it('should support English language', () => {
      expect(advancedI18nService.isLanguageSupported('en')).toBe(true);
    });

    it('should support Arabic language', () => {
      expect(advancedI18nService.isLanguageSupported('ar')).toBe(true);
    });

    it('should not support unsupported languages', () => {
      expect(advancedI18nService.isLanguageSupported('fr')).toBe(false);
    });

    it('should return available languages', () => {
      const languages = advancedI18nService.getAvailableLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('ar');
    });
  });

  describe('Error Handling', () => {
    it('should fallback to default when translation key not found', () => {
      const result = advancedI18nService.translate('nonexistent.key', {
        defaultValue: 'Default message'
      });
      expect(result).toBe('Default message');
    });

    it('should fallback to English when language not supported', () => {
      const result = advancedI18nService.translate('common.buttons.save', {
        lang: 'unsupported'
      });
      expect(result).toBe('Save');
    });
  });
});
