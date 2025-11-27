import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

/**
 * Check if a string is a translation key
 * Translation keys start with "t." prefix
 */
export function isTranslationKey(value: string | null | undefined): boolean {
  return value?.startsWith('t.') ?? false;
}

/**
 * Translate a value if it's a translation key, otherwise return as-is
 * @param i18n I18nService instance
 * @param value Value to translate (translation key or actual text)
 * @param shouldTranslate Whether to attempt translation
 * @returns Translated value or original value
 */
export function translateIfNeeded(
  i18n: I18nService<I18nTranslations>,
  value: string | null | undefined,
  shouldTranslate: boolean,
): string | null {
  if (!value) {
    return null;
  }

  if (shouldTranslate && isTranslationKey(value)) {
    try {
      return i18n.translate(value as any);
    } catch {
      // Fallback to original if translation fails
      return value;
    }
  }

  return value;
}
