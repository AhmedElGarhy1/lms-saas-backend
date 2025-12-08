import { I18nPath } from '@/generated/i18n.generated';
import { TranslationService } from '@/shared/common/services/translation.service';
import { PathArgs } from '@/generated/i18n-type-map.generated';

/**
 * Type-safe translation helper for error messages
 * @param translationService - TranslationService instance (type-safe)
 * @param key - Translation key (I18nPath)
 * @param args - Optional arguments for translation interpolation (type-safe, uses generated types)
 * @returns Translated error message
 */
export function translateError<P extends I18nPath>(
  translationService: TranslationService,
  key: P,
  args?: PathArgs<P>,
): string {
  return translationService.translate(key, args);
}

/**
 * Type-safe translation helper for resource names
 * @param translationService - TranslationService instance (type-safe)
 * @param resource - Resource name (e.g., 'user', 'center', 'branch')
 * @returns Translated resource name
 */
export function translateResource(
  translationService: TranslationService,
  resource: string,
): string {
  const resourceKey = `t.resources.${resource}` as I18nPath;
  return translationService.translate(resourceKey);
}
