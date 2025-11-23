import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

/**
 * Type-safe translation helper for error messages
 * @param i18n - I18nService instance
 * @param key - Translation key (e.g., 'errors.userNotFound')
 * @param args - Optional arguments for translation interpolation
 * @returns Translated error message
 */
export function translateError(
  i18n: I18nService<I18nTranslations>,
  key: string,
  args?: Record<string, any>,
): string {
  return i18n.translate(key as any, { args });
}

/**
 * Type-safe translation helper for resource names
 * @param i18n - I18nService instance
 * @param resource - Resource name (e.g., 'user', 'center', 'branch')
 * @returns Translated resource name
 */
export function translateResource(
  i18n: I18nService<I18nTranslations>,
  resource: string,
): string {
  return i18n.translate(`common.resources.${resource}` as any);
}

