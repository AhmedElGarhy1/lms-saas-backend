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
  translate(key: I18nPath, args?: Record<string, any>): string {
    // Try injected service first
    if (this.i18nService) {
      try {
        return this.i18nService.translate(key, {
          args,
          lang: RequestContext.get().locale,
        });
      } catch {
        // Fallback to I18nContext if service fails
      }
    }

    // Fallback to I18nContext
    const i18n = I18nContext.current();
    if (i18n) {
      try {
        return i18n.translate(key, {
          args,
          lang: RequestContext.get().locale,
        });
      } catch {
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
  static translate(key: I18nPath, args?: Record<string, any>): string {
    const i18n = I18nContext.current();
    if (i18n) {
      try {
        const locale = RequestContext.get().locale;
        return i18n.translate(key, {
          args,
          lang: locale,
        });
      } catch {
        // If translation fails, return key as fallback
      }
    }

    // Fallback: return key if no translation available
    return key;
  }

  /**
   * Check if a translation key exists
   */
  static hasTranslation(key: I18nPath): boolean {
    const i18n = I18nContext.current();
    if (!i18n) return false;

    try {
      const translated = i18n.translate(key);
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
    key: I18nPath,
    args?: Record<string, any>,
  ): string {
    const i18n = I18nContext.current();
    if (i18n) {
      try {
        return i18n.translate(key, {
          args,
          lang: Locale.EN, // Force English
        });
      } catch {
        // Fallback to key if translation fails
      }
    }
    return key;
  }

  /**
   * Translate invalid error message
   * @param field Field name (will be translated if it's a translation key starting with 't.')
   * @param type Error type: 'generic' | 'format' | 'expired' | 'missing' | 'type'
   */
  static translateInvalid(
    field: string,
    type: 'generic' | 'format' | 'expired' | 'missing' | 'type' = 'generic',
  ): string {
    const fieldLabel = field.startsWith('t.')
      ? TranslationService.translate(field as I18nPath)
      : field;
    return TranslationService.translate(
      `t.errors.invalid.${type}` as I18nPath,
      { field: fieldLabel },
    );
  }

  /**
   * Translate not found error message
   * @param resource Resource name (will be translated if it's a translation key starting with 't.')
   * @param identifier Optional identifier (e.g., 'ID', 'name')
   * @param value Optional value for the identifier
   */
  static translateNotFound(
    resource: string,
    identifier?: string,
    value?: string,
  ): string {
    const resourceLabel = resource.startsWith('t.')
      ? TranslationService.translate(resource as I18nPath)
      : resource;

    if (identifier && value) {
      return TranslationService.translate(
        't.errors.notFound.withId' as I18nPath,
        {
          resource: resourceLabel,
          identifier,
          value,
        },
      );
    }

    return TranslationService.translate('t.errors.notFound.generic' as I18nPath, {
      resource: resourceLabel,
    });
  }

  /**
   * Translate already exists/has/is error message
   * @param resource Resource name (will be translated if it's a translation key starting with 't.')
   * @param type Type: 'exists' | 'existsWithField' | 'has' | 'is' | 'deleted'
   * @param what Optional: what the resource already has (for 'has' type)
   * @param state Optional: current state (for 'is' type)
   * @param field Optional: field name (for 'existsWithField' type)
   * @param value Optional: field value (for 'existsWithField' type)
   */
  static translateAlready(
    resource: string,
    type: 'exists' | 'existsWithField' | 'has' | 'is' | 'deleted',
    what?: string,
    state?: string,
    field?: string,
    value?: string,
  ): string {
    const resourceLabel = resource.startsWith('t.')
      ? TranslationService.translate(resource as I18nPath)
      : resource;

    const args: Record<string, any> = { resource: resourceLabel };

    if (type === 'has' && what) {
      args.what = what.startsWith('t.')
        ? TranslationService.translate(what as I18nPath)
        : what;
    } else if (type === 'is' && state) {
      args.state = state.startsWith('t.')
        ? TranslationService.translate(state as I18nPath)
        : state;
    } else if (type === 'existsWithField' && field && value) {
      args.field = field;
      args.value = value;
    }

    return TranslationService.translate(
      `t.errors.already.${type}` as I18nPath,
      args,
    );
  }

  /**
   * Translate cannot error message
   * @param action Action name (will be translated if it's a translation key starting with 't.')
   * @param resource Resource name (will be translated if it's a translation key starting with 't.')
   * @param reason Optional reason
   */
  static translateCannot(
    action: string,
    resource: string,
    reason?: string,
  ): string {
    const actionLabel = action.startsWith('t.')
      ? TranslationService.translate(action as I18nPath)
      : action;
    const resourceLabel = resource.startsWith('t.')
      ? TranslationService.translate(resource as I18nPath)
      : resource;

    if (reason) {
      return TranslationService.translate('t.errors.cannot.actionReason' as I18nPath, {
        action: actionLabel,
        resource: resourceLabel,
        reason,
      });
    }

    return TranslationService.translate('t.errors.cannot.action' as I18nPath, {
      action: actionLabel,
      resource: resourceLabel,
    });
  }

  /**
   * Translate not authorized error message
   * @param action Action name (will be translated if it's a translation key starting with 't.')
   * @param resource Resource name (will be translated if it's a translation key starting with 't.')
   */
  static translateNotAuthorized(action: string, resource: string): string {
    const actionLabel = action.startsWith('t.')
      ? TranslationService.translate(action as I18nPath)
      : action;
    const resourceLabel = resource.startsWith('t.')
      ? TranslationService.translate(resource as I18nPath)
      : resource;

    return TranslationService.translate('t.errors.notAuthorized.action' as I18nPath, {
      action: actionLabel,
      resource: resourceLabel,
    });
  }

  /**
   * Translate CRUD operation message
   * @param action Action: 'create' | 'update' | 'delete' | 'restore' | 'activate' | 'deactivate'
   * @param resource Resource name (will be translated if it's a translation key starting with 't.')
   */
  static translateCRUD(
    action: 'create' | 'update' | 'delete' | 'restore' | 'activate' | 'deactivate',
    resource: string,
  ): string {
    const resourceLabel = resource.startsWith('t.')
      ? TranslationService.translate(resource as I18nPath)
      : resource;

    return TranslationService.translate(`t.success.${action}` as I18nPath, {
      resource: resourceLabel,
    });
  }

  /**
   * Translate expired error message
   * @param resource Resource name (will be translated if it's a translation key starting with 't.')
   * @param type Type: 'generic' | 'orInvalid' | 'session'
   */
  static translateExpired(
    resource: string,
    type: 'generic' | 'orInvalid' | 'session' = 'generic',
  ): string {
    if (type === 'session') {
      return TranslationService.translate('t.errors.expired.session' as I18nPath);
    }

    const resourceLabel = resource.startsWith('t.')
      ? TranslationService.translate(resource as I18nPath)
      : resource;

    return TranslationService.translate(
      `t.errors.expired.${type}` as I18nPath,
      { resource: resourceLabel },
    );
  }
}
