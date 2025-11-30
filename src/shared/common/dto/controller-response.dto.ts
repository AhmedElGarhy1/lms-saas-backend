import { I18nPath } from '@/generated/i18n.generated';
import { OptionalArgs } from '@/generated/i18n-type-map.generated';
import { TranslationMessage } from '../types/translation.types';

export class ControllerResponse<T = any, P extends I18nPath = I18nPath> {
  data?: T;
  message: TranslationMessage<P>;

  constructor(data: T | undefined, message: TranslationMessage<P>) {
    this.data = data;
    this.message = message;
  }

  /**
   * Create success response with translation key
   * Translation happens in TranslationResponseInterceptor
   * @param data Response data
   * @param messageKey Translation key (I18nPath)
   * @param args Optional translation arguments (type-safe, required when key needs them)
   */
  static success<T, P extends I18nPath = I18nPath>(
    data: T,
    messageKey: P,
    args?: OptionalArgs<P>,
  ): ControllerResponse<T, P> {
    return new ControllerResponse(data, { key: messageKey, args });
  }

  /**
   * Create message-only response with translation key
   * Translation happens in TranslationResponseInterceptor
   * @param messageKey Translation key (I18nPath)
   * @param args Optional translation arguments (type-safe, required when key needs them)
   */
  static message<P extends I18nPath = I18nPath>(
    messageKey: P,
    args?: OptionalArgs<P>,
  ): ControllerResponse<null, P> {
    return new ControllerResponse(null, { key: messageKey, args });
  }

  /**
   * Create error response with translation key
   * Translation happens in TranslationResponseInterceptor
   * @param messageKey Translation key (I18nPath)
   * @param args Optional translation arguments (type-safe, required when key needs them)
   */
  static error<P extends I18nPath = I18nPath>(
    messageKey: P,
    args?: OptionalArgs<P>,
  ): ControllerResponse<null, P> {
    return new ControllerResponse(null, { key: messageKey, args });
  }
}
