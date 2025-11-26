import { I18nPath } from '@/generated/i18n.generated';
import { TranslationService } from '@/shared/services/translation.service';

export class ControllerResponse<T = any> {
  data?: T;
  message: string;

  constructor(data: T | undefined, message: string) {
    this.data = data;
    this.message = message;
  }

  /**
   * Create success response with translation key or translated string
   * @param data Response data
   * @param messageKey Translation key (I18nPath) or already-translated string
   * @param args Optional translation arguments
   */
  static success<T>(
    data: T,
    messageKey: I18nPath | string,
    args?: Record<string, any>,
  ): ControllerResponse<T> {
    // If messageKey starts with 't.', it's a translation key - translate it
    // Otherwise, assume it's already translated (backward compatibility)
    let processedArgs = args;
    if (args) {
      // Process args: if any value is a translation key (starts with 't.'), translate it
      processedArgs = { ...args };
      for (const key in processedArgs) {
        const value = processedArgs[key];
        if (typeof value === 'string' && value.startsWith('t.')) {
          processedArgs[key] = TranslationService.translate(
            value as I18nPath,
          );
        }
      }
    }

    const message =
      typeof messageKey === 'string' && messageKey.startsWith('t.')
        ? TranslationService.translate(messageKey as I18nPath, processedArgs)
        : messageKey;

    return new ControllerResponse(data, message);
  }

  /**
   * Create message-only response with translation key or translated string
   * @param messageKey Translation key (I18nPath) or already-translated string
   * @param args Optional translation arguments
   */
  static message(
    messageKey: I18nPath | string,
    args?: Record<string, any>,
  ): ControllerResponse<null> {
    let processedArgs = args;
    if (args) {
      processedArgs = { ...args };
      for (const key in processedArgs) {
        const value = processedArgs[key];
        if (typeof value === 'string' && value.startsWith('t.')) {
          processedArgs[key] = TranslationService.translate(
            value as I18nPath,
          );
        }
      }
    }

    const message =
      typeof messageKey === 'string' && messageKey.startsWith('t.')
        ? TranslationService.translate(messageKey as I18nPath, processedArgs)
        : messageKey;

    return new ControllerResponse(null, message);
  }

  /**
   * Create error response with translation key or translated string
   * @param messageKey Translation key (I18nPath) or already-translated string
   * @param args Optional translation arguments
   */
  static error(
    messageKey: I18nPath | string,
    args?: Record<string, any>,
  ): ControllerResponse<null> {
    let processedArgs = args;
    if (args) {
      processedArgs = { ...args };
      for (const key in processedArgs) {
        const value = processedArgs[key];
        if (typeof value === 'string' && value.startsWith('t.')) {
          processedArgs[key] = TranslationService.translate(
            value as I18nPath,
          );
        }
      }
    }

    const message =
      typeof messageKey === 'string' && messageKey.startsWith('t.')
        ? TranslationService.translate(messageKey as I18nPath, processedArgs)
        : messageKey;

    return new ControllerResponse(null, message);
  }
}
