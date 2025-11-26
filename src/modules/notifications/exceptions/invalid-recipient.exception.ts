import { InvalidOperationException } from '@/shared/common/exceptions/custom.exceptions';
import { I18nPath } from '@/generated/i18n.generated';

/**
 * Exception thrown when recipient validation fails
 */
export class InvalidRecipientException extends InvalidOperationException {
  constructor(
    translationKey: I18nPath,
    public readonly validationErrors?: Array<{
      field: string;
      message: string;
    }>,
    translationArgs?: Record<string, any>,
  ) {
    super(translationKey, translationArgs);
  }

  /**
   * Create from Zod validation error
   */
  static fromZodError(error: unknown): InvalidRecipientException {
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as {
        issues: Array<{ path: (string | number)[]; message: string }>;
      };
      const validationErrors = zodError.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      const message = validationErrors
        .map((e) => `${e.field}: ${e.message}`)
        .join(', ');

      return new InvalidRecipientException(
        't.errors.recipientValidationFailed',
        validationErrors,
        { message },
      );
    }

    return new InvalidRecipientException('t.errors.recipientValidationFailed', undefined, {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
