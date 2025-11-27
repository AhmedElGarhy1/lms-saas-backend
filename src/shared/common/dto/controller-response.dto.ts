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
   * Create success response with translation key
   * @param data Response data
   * @param messageKey Translation key (I18nPath)
   * @param args Optional translation arguments
   */
  static success<T>(
    data: T,
    messageKey: I18nPath,
    args?: Record<string, any>,
  ): ControllerResponse<T> {
    // Process args: if any value is a translation key (starts with 't.'), translate it
    let processedArgs: Record<string, any> | undefined = args;
    if (args) {
      processedArgs = { ...args };
      for (const key in processedArgs) {
        const value: unknown = processedArgs[key];
        if (typeof value === 'string' && value.startsWith('t.')) {
          processedArgs[key] = TranslationService.translate(value as I18nPath);
        }
      }
    }

    const message = TranslationService.translate(messageKey, processedArgs);

    return new ControllerResponse(data, message);
  }

  /**
   * Create message-only response with translation key
   * @param messageKey Translation key (I18nPath)
   * @param args Optional translation arguments
   */
  static message(
    messageKey: I18nPath,
    args?: Record<string, any>,
  ): ControllerResponse<null> {
    // Process args: if any value is a translation key (starts with 't.'), translate it
    let processedArgs: Record<string, any> | undefined = args;
    if (args) {
      processedArgs = { ...args };
      for (const key in processedArgs) {
        const value: unknown = processedArgs[key];
        if (typeof value === 'string' && value.startsWith('t.')) {
          processedArgs[key] = TranslationService.translate(value as I18nPath);
        }
      }
    }

    const message = TranslationService.translate(messageKey, processedArgs);

    return new ControllerResponse(null, message);
  }

  /**
   * Create error response with translation key
   * @param messageKey Translation key (I18nPath)
   * @param args Optional translation arguments
   */
  static error(
    messageKey: I18nPath,
    args?: Record<string, any>,
  ): ControllerResponse<null> {
    // Process args: if any value is a translation key (starts with 't.'), translate it
    let processedArgs: Record<string, any> | undefined = args;
    if (args) {
      processedArgs = { ...args };
      for (const key in processedArgs) {
        const value: unknown = processedArgs[key];
        if (typeof value === 'string' && value.startsWith('t.')) {
          processedArgs[key] = TranslationService.translate(value as I18nPath);
        }
      }
    }

    const message = TranslationService.translate(messageKey, processedArgs);

    return new ControllerResponse(null, message);
  }
}
