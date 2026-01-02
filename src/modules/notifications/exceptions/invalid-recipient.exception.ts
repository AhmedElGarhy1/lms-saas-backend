import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when recipient validation fails
 */
export class InvalidRecipientException extends HttpException {
  constructor(
    message: string,
    public readonly validationErrors?: Array<{
      field: string;
      message: string;
    }>,
  ) {
    super(
      {
        error: 'Invalid Recipient',
        message: `Recipient validation failed: ${message}`,
        validationErrors,
      },
      HttpStatus.BAD_REQUEST,
    );
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
