import { I18nPath } from '@/generated/i18n.generated';
import { TranslationMessage } from '@/generated/i18n-type-map.generated';

export class ControllerResponse<T = any, P extends I18nPath = I18nPath> {
  data?: T;
  message: TranslationMessage<P>;

  constructor(data: T | undefined, message: TranslationMessage<P>) {
    this.data = data;
    this.message = message;
  }

  /**
   * Create success response with translation message
   * Translation happens in TranslationResponseInterceptor
   *
   * The TranslationMessage type enforces that args MUST be provided
   * when the translation key requires them.
   */
  static success<T, P extends I18nPath>(
    data: T,
    message: TranslationMessage<P>,
  ): ControllerResponse<T, P> {
    return new ControllerResponse(data, message);
  }

  /**
   * Create message-only response with translation message
   * Translation happens in TranslationResponseInterceptor
   */
  static message<P extends I18nPath>(
    message: TranslationMessage<P>,
  ): ControllerResponse<null, P> {
    return new ControllerResponse(null, message);
  }

  /**
   * Create error response with translation message
   * Translation happens in TranslationResponseInterceptor
   */
  static error<P extends I18nPath>(
    message: TranslationMessage<P>,
  ): ControllerResponse<null, P> {
    return new ControllerResponse(null, message);
  }
}
