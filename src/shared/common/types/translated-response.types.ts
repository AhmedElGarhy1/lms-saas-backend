import { ErrorCode } from '../enums/error-codes.enum';
import { ErrorDetail } from '../exceptions/custom.exceptions';

/**
 * Translated error response type
 * Used after translation has occurred - message and details are strings, not TranslationMessage objects
 */
export interface TranslatedErrorResponse {
  statusCode: number;
  message: string; // Translated string
  code: ErrorCode;
  timestamp: string;
  path?: string;
  method?: string;
  details?: Array<Omit<ErrorDetail, 'message'> & { message: string }>; // Translated string
  debug?: any;
}
