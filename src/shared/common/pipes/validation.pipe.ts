import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  ErrorDetail,
  EnhancedErrorResponse,
} from '../exceptions/custom.exceptions';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(CustomValidationPipe.name);

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      validationError: {
        target: false,
        value: false,
      },
    });

    if (errors.length > 0) {
      const validationErrors: ErrorDetail[] =
        this.flattenValidationErrors(errors);

      this.logger.warn('Validation failed', {
        errors: validationErrors,
        metatype: metatype.name,
        errorCount: errors.length,
      });

      const errorResponse: EnhancedErrorResponse = {
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        userMessage: 'Please check your input and try again.',
        actionRequired: 'Fix the highlighted errors below.',
        retryable: true,
        details: validationErrors,
      };

      throw new BadRequestException(errorResponse);
    }

    return object;
  }

  private toValidate(metatype: new (...args: any[]) => any): boolean {
    const types: (new (...args: any[]) => any)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }

  private flattenValidationErrors(errors: ValidationError[]): ErrorDetail[] {
    const result: ErrorDetail[] = [];

    for (const error of errors) {
      if (error.constraints) {
        result.push({
          field: error.property,
          value: error.value,
          message: Object.values(error.constraints).join(', '),
          code: 'VALIDATION_ERROR',
          suggestion: this.getValidationSuggestion(
            error.property,
            error.constraints,
          ),
        });
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.flattenValidationErrors(error.children);
        // Prefix nested field names with parent field
        const prefixedErrors = nestedErrors.map((nestedError) => ({
          ...nestedError,
          field: `${error.property}.${nestedError.field}`,
        }));
        result.push(...prefixedErrors);
      }
    }

    return result;
  }

  private getValidationSuggestion(
    field: string,
    constraints: Record<string, any>,
  ): string {
    // Common validation suggestions
    const suggestions: Record<string, string> = {
      isEmail: 'Please enter a valid email address',
      isNotEmpty: 'This field is required',
      isUrl: 'Please enter a valid URL',
      isEnum: `Please select a valid option for ${field}`,
      isNumber: `Please enter a valid number for ${field}`,
      isBoolean: `Please select yes or no for ${field}`,
      isDate: `Please enter a valid date for ${field}`,
      isArray: `Please provide a list of items for ${field}`,
      isObject: `Please provide valid data for ${field}`,
      isUUID: `Please enter a valid UUID for ${field}`,
      isPositive: `Please enter a positive number for ${field}`,
      isNegative: `Please enter a negative number for ${field}`,
      isInt: `Please enter a whole number for ${field}`,
      isDecimal: `Please enter a decimal number for ${field}`,
      isAlpha: `Please enter only letters for ${field}`,
      isAlphanumeric: `Please enter only letters and numbers for ${field}`,
      isNumeric: `Please enter only numbers for ${field}`,
      isPhoneNumber: `Please enter a valid phone number for ${field}`,
      isPostalCode: `Please enter a valid postal code for ${field}`,
      isCreditCard: `Please enter a valid credit card number for ${field}`,
      isIBAN: `Please enter a valid IBAN for ${field}`,
      isBIC: `Please enter a valid BIC for ${field}`,
      isBase64: `Please enter valid base64 data for ${field}`,
      isDataURI: `Please enter a valid data URI for ${field}`,
      isMongoId: `Please enter a valid MongoDB ID for ${field}`,
      isFirebasePushId: `Please enter a valid Firebase push ID for ${field}`,
      isISIN: `Please enter a valid ISIN for ${field}`,
      isHexColor: `Please enter a valid hex color for ${field}`,
      isHSL: `Please enter a valid HSL color for ${field}`,
      isRgbColor: `Please enter a valid RGB color for ${field}`,
      isSemVer: `Please enter a valid semantic version for ${field}`,
      isStrongPassword: `Please enter a strong password for ${field}`,
      isTimeZone: `Please enter a valid timezone for ${field}`,
      isLocale: `Please enter a valid locale for ${field}`,
      isCurrency: `Please enter a valid currency code for ${field}`,
      isEthereumAddress: `Please enter a valid Ethereum address for ${field}`,
      isBitcoinAddress: `Please enter a valid Bitcoin address for ${field}`,
      isISO8601: `Please enter a valid ISO 8601 date for ${field}`,
      isRFC3339: `Please enter a valid RFC 3339 date for ${field}`,
      isJWT: `Please enter a valid JWT token for ${field}`,
      isPassportNumber: `Please enter a valid passport number for ${field}`,
      isLicensePlate: `Please enter a valid license plate for ${field}`,
      isVAT: `Please enter a valid VAT number for ${field}`,
      isEAN: `Please enter a valid EAN for ${field}`,
      isISRC: `Please enter a valid ISRC for ${field}`,
      isIMEI: `Please enter a valid IMEI for ${field}`,
      isISBN: `Please enter a valid ISBN for ${field}`,
      isISSN: `Please enter a valid ISSN for ${field}`,
      isISMN: `Please enter a valid ISMN for ${field}`,
      isISWC: `Please enter a valid ISWC for ${field}`,
      isISAN: `Please enter a valid ISAN for ${field}`,
      isISNI: `Please enter a valid ISNI for ${field}`,
      isORCID: `Please enter a valid ORCID for ${field}`,
      isDOI: `Please enter a valid DOI for ${field}`,
      isPMID: `Please enter a valid PMID for ${field}`,
      isPMCID: `Please enter a valid PMCID for ${field}`,
      isArXiv: `Please enter a valid arXiv ID for ${field}`,
      isHandle: `Please enter a valid handle for ${field}`,
    };

    // Check for specific constraints first
    for (const [constraint, message] of Object.entries(suggestions)) {
      if (constraints[constraint]) {
        return message;
      }
    }

    // Handle length constraints with dynamic values
    if (constraints.minLength) {
      return `Must be at least ${constraints.minLength} characters`;
    }
    if (constraints.maxLength) {
      return `Must be no more than ${constraints.maxLength} characters`;
    }

    return 'Please check this field';
  }
}
