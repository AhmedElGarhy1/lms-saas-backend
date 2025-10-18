import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { UserService } from '@/modules/user/services/user.service';
import { I18nTranslations } from '../../../../generated/i18n.generated';

@Injectable()
export class LocaleService {
  constructor(
    private readonly userService: UserService,
    private readonly i18nService: I18nService<I18nTranslations>,
  ) {}

  private loadTranslations(lang: string): any {
    // In the compiled version, the i18n files are in the root dist/i18n directory
    const jsonDir = path.join(process.cwd(), 'dist', 'i18n', lang);
    const translations: any = {};

    if (fs.existsSync(jsonDir)) {
      const files = fs.readdirSync(jsonDir);
      files.forEach((file) => {
        if (file.endsWith('.json')) {
          const fileName = file.replace('.json', '');
          const filePath = path.join(jsonDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          translations[fileName] = JSON.parse(content);
        }
      });
    }

    return translations;
  }

  private loadTranslationsForLang(lang: string): any {
    return this.loadTranslations(lang);
  }

  async getTranslations(lang: string | undefined, req: Request) {
    const userLocale = await this.getUserLocale(req);

    const currentLanguage = lang || userLocale;
    console.log('userLocale', currentLanguage);
    console.log('lang', lang);
    console.log('currentLanguage', currentLanguage);
    return this.loadTranslationsForLang(currentLanguage);
  }

  async getUserLocale(req: Request) {
    const i18n = I18nContext.current();
    let locale = i18n?.lang || 'ar';
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
      return locale;
    }
    const decoded = jwt.decode(accessToken);
    if (decoded) {
      const user = await this.userService.findOne(decoded.sub as string);
      if (user) {
        locale = user.locale;
      }
    }
    return locale;
  }

  getAvailableLanguages() {
    // Get available languages from the i18n directory
    const i18nDir = path.join(process.cwd(), 'dist', 'i18n');
    const languages: string[] = [];

    if (fs.existsSync(i18nDir)) {
      const dirs = fs.readdirSync(i18nDir, { withFileTypes: true });
      dirs.forEach((dir) => {
        if (dir.isDirectory() && dir.name !== 'i18n.config.ts') {
          languages.push(dir.name);
        }
      });
    }

    return languages.length > 0 ? languages : ['en', 'ar'];
  }

  /**
   * Get translation with advanced features
   */
  getTranslation(
    key: string,
    options?: { lang?: string; args?: Record<string, any> },
  ) {
    return this.i18nService.translate(key as any, options);
  }

  /**
   * Get formatted translation with variables
   */
  getFormattedTranslation(
    key: string,
    options?: {
      lang?: string;
      args?: Record<string, any>;
      formatters?: Record<string, any>;
    },
  ) {
    return this.i18nService.translate(key as any, options);
  }

  /**
   * Get pluralized translation
   */
  getPluralizedTranslation(
    key: string,
    count: number,
    options?: {
      lang?: string;
      args?: Record<string, any>;
    },
  ) {
    return this.i18nService.translate(key as any, {
      ...options,
      args: { count, ...options?.args },
    });
  }

  /**
   * Get current language from context
   */
  getCurrentLanguage(): string {
    return I18nContext.current()?.lang || 'en';
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(lang: string): boolean {
    return this.i18nService.getSupportedLanguages().includes(lang);
  }
}
