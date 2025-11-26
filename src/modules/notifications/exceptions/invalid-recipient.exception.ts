import { InternalInvalidOperationException } from '@/shared/common/exceptions/custom.exceptions';

/**
 * Exception thrown when recipient validation fails
 */
export class InvalidRecipientException extends InternalInvalidOperationException {
  constructor(
    message: string,
    public readonly validationErrors?: Array<{
      field: string;
      message: string;
    }>,
  ) {
    super(`Recipient validation failed: ${message}`);
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

      return new InvalidRecipientException(message, validationErrors);
    }

    return new InvalidRecipientException(
      error instanceof Error ? error.message : String(error),
    );
  }
}
