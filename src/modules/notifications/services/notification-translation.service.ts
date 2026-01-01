import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Lightweight notification-specific translation service
 * Loads translations from JSON files without external i18n dependencies
 */
@Injectable()
export class NotificationTranslationService {
  private readonly logger = new Logger(NotificationTranslationService.name);
  private readonly translations = new Map<string, any>();

  /**
   * Translate a notification key to the specified locale
   * @param key - i18n key (e.g., "notifications.OTP.title")
   * @param locale - Target locale (e.g., "en", "ar")
   * @returns Translated string or the key if translation fails
   */
  async translate(key: string, locale: string = 'en'): Promise<string> {
    try {
      const translations = await this.loadTranslations(locale);

      // Remove "notifications." prefix and split by dots
      const keys = key.replace('notifications.', '').split('.');
      let value = translations;

      // Navigate nested object structure
      for (const k of keys) {
        value = value?.[k];
      }

      // Return translated string or fallback to key
      return typeof value === 'string' ? value : key;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Translation failed for key: ${key}, locale: ${locale}`,
        {
          key,
          locale,
          error: errorMessage,
        },
      );
      return key; // Fallback to key if translation fails
    }
  }

  /**
   * Load translations for a specific locale from JSON file
   * Caches translations in memory for performance
   */
  private async loadTranslations(locale: string): Promise<any> {
    if (this.translations.has(locale)) {
      return this.translations.get(locale);
    }

    try {
      const filePath = join(process.cwd(), 'src', 'i18n', locale, 'notifications.json');
      const content = await readFile(filePath, 'utf-8');
      const translations = JSON.parse(content);

      this.translations.set(locale, translations);
      this.logger.debug(`Loaded notification translations for locale: ${locale}`);
      return translations;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to load notification translations for locale: ${locale}`,
        errorMessage,
      );
      throw new Error(`Translation file not found for locale: ${locale}`);
    }
  }

  /**
   * Check if a translation exists for a given key and locale
   */
  async hasTranslation(key: string, locale: string = 'en'): Promise<boolean> {
    try {
      const translation = await this.translate(key, locale);
      return translation !== key; // If different from key, translation exists
    } catch {
      return false;
    }
  }

  /**
   * Get all available locales that have notification translations
   */
  getAvailableLocales(): string[] {
    // Return supported locales that have notification files
    return ['en', 'ar'];
  }
}
