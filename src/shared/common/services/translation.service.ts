import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations, I18nPath } from '@/generated/i18n.generated';
import { PathArgs } from '@/generated/i18n-type-map.generated';

/**
 * Type-safe translation service
 *
 * Provides compile-time type safety for translation arguments while
 * using nestjs-i18n as the runtime translator.
 *
 * Usage:
 * ```ts
 * constructor(private readonly translationService: TranslationService) {}
 *
 * // Type-safe - TypeScript will enforce correct arguments
 * // Use translation keys for UI text (full IntelliSense)
 * const message = this.translationService.translate('t.buttons.createResource', {
 *   resource: 't.resources.user' // ✅ Translation key with full autocomplete
 * });
 *
 * // Type error if arguments are missing or incorrect
 * // this.translationService.translate('t.common.buttons.createResource', {}); // ❌ Error: missing 'resource'
 * ```
 */
@Injectable()
export class TranslationService {
  constructor(private readonly i18n: I18nService<I18nTranslations>) {}

  /**
   * Translate a key with type-safe arguments
   * @param key - Translation key (I18nPath)
   * @param args - Arguments required by the translation key (type-safe, uses generated types)
   * @returns Translated string
   */
  translate<P extends I18nPath>(key: P, args?: PathArgs<P>): string {
    return this.i18n.translate(key, { args });
  }

  /**
   * Translate a key with type-safe arguments and locale override
   * @param key - Translation key (I18nPath)
   * @param args - Arguments required by the translation key (type-safe, uses generated types)
   * @param locale - Optional locale override
   * @returns Translated string
   */
  translateWithLocale<P extends I18nPath>(
    key: P,
    args?: PathArgs<P>,
    locale?: string,
  ): string {
    return this.i18n.translate(key, { args, lang: locale });
  }
}
