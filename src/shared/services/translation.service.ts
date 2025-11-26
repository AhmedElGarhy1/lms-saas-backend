import { Injectable, Optional } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { I18nTranslations, I18nPath } from '@/generated/i18n.generated';
import { RequestContext } from '@/shared/common/context/request.context';
import { Locale } from '@/shared/common/enums/locale.enum';

/**
 * Centralized translation service
 * Provides both injectable instance methods and static methods
 * Uses I18nContext.current() as fallback for static access
 * Uses RequestContext for locale resolution
 */
@Injectable()
export class TranslationService {
  constructor(
    @Optional() private readonly i18nService?: I18nService<I18nTranslations>,
  ) {}

  /**
   * Translate a key with optional arguments
   * Uses injected I18nService if available, otherwise falls back to I18nContext
   */
  translate(
    key: I18nPath | string,
    args?: Record<string, any>,
  ): string {
    // Try injected service first
    if (this.i18nService) {
      try {
        return this.i18nService.translate(key as I18nPath, {
          args,
          lang: RequestContext.get().locale,
        });
      } catch (error) {
        // Fallback to I18nContext if service fails
      }
    }

    // Fallback to I18nContext
    const i18n = I18nContext.current();
    if (i18n) {
      try {
        return i18n.translate(key as I18nPath, {
          args,
          lang: RequestContext.get().locale,
        });
      } catch (error) {
        // If translation fails, return key as fallback
      }
    }

    // Final fallback: return key if no translation available
    return key;
  }

  /**
   * Static method for translation without injection
   * Uses I18nContext.current() and RequestContext for locale
   */
  static translate(
    key: I18nPath | string,
    args?: Record<string, any>,
  ): string {
    const i18n = I18nContext.current();
    if (i18n) {
      try {
        const locale = RequestContext.get().locale;
        return i18n.translate(key as I18nPath, {
          args,
          lang: locale,
        });
      } catch (error) {
        // If translation fails, return key as fallback
      }
    }

    // Fallback: return key if no translation available
    return key;
  }

  /**
   * Check if a translation key exists
   */
  static hasTranslation(key: I18nPath | string): boolean {
    const i18n = I18nContext.current();
    if (!i18n) return false;

    try {
      const translated = i18n.translate(key as I18nPath);
      // If translation returns the key itself, it doesn't exist
      return translated !== key;
    } catch {
      return false;
    }
  }

  /**
   * Translate a key to English for logging purposes
   * Always uses 'en' locale regardless of request context
   */
  static translateForLogging(
    key: I18nPath | string,
    args?: Record<string, any>,
  ): string {
    const i18n = I18nContext.current();
    if (i18n) {
      try {
        return i18n.translate(key as I18nPath, {
          args,
          lang: Locale.EN, // Force English
        });
      } catch (error) {
        // Fallback to key if translation fails
      }
    }
    return key;
  }
}


