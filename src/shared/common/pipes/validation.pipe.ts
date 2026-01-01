import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IRequest } from '../interfaces/request.interface';
import {
  ErrorDetail,
  EnhancedErrorResponse,
} from '../exceptions/custom.exceptions';
import { ErrorCode } from '../enums/error-codes.enum';
import { TimezoneService } from '../services/timezone.service';
import { EnterpriseLoggerService } from '../services/enterprise-logger.service';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

/**
 * Custom validation pipe that transforms class-validator errors
 * into structured error responses with i18n support.
 */
@Injectable()
export class CustomValidationPipe implements PipeTransform {
  constructor(
    @Optional() @Inject(EnterpriseLoggerService) private readonly enterpriseLogger?: EnterpriseLoggerService,
    @Optional() @Inject(REQUEST) private readonly request?: Request,
  ) {}
  /**
   * Transforms and validates the incoming value.
   *
   * @param value The value to validate
   * @param metadata Argument metadata containing type information
   * @returns The validated and transformed object
   * @throws BadRequestException if validation fails
   */
  async transform(
    value: unknown,
    { metatype }: ArgumentMetadata,
  ): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const object = plainToInstance(metatype, value);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const errors = await validate(object);

    if (errors.length > 0) {
      const validationErrors: ErrorDetail[] =
        this.flattenValidationErrors(errors);

      const errorResponse: EnhancedErrorResponse = {
        statusCode: 400,
        message: 'Validation failed',
        code: ErrorCode.VALIDATION_FAILED,
        timestamp: new Date().toISOString(),
        details: validationErrors,
      };

      // Log validation errors with enterprise logger if available
      if (this.enterpriseLogger && this.request) {
        this.enterpriseLogger.logValidationError(
          this.request,
          validationErrors,
          (this.request as unknown as IRequest).actor,
        );
      }

      throw new BadRequestException(errorResponse);
    }

    return object;
  }

  /**
   * Checks if the metatype should be validated.
   *
   * @param metatype The type to check
   * @returns True if the type should be validated
   */
  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: (new (...args: unknown[]) => unknown)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }

  /**
   * Flattens nested validation errors into a flat array.
   *
   * @param errors Array of validation errors
   * @returns Flattened array of error details
   */
  private flattenValidationErrors(errors: ValidationError[]): ErrorDetail[] {
    const result: ErrorDetail[] = [];

    for (const error of errors) {
      // Process all constraints, not just the first one
      if (error.constraints) {
        const constraintKeys = Object.keys(error.constraints);
        for (const constraintKey of constraintKeys) {
          const errorMessage = this.getValidationMessage(
            error.property,
            constraintKey,
          );

          const errorDetail: ErrorDetail = {
            field: error.property,
            value: error.value,
            message: errorMessage,
          };
          result.push(errorDetail);
        }
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

  /**
   * Maps class-validator constraint keys to plain English validation messages.
   *
   * @param field The field name
   * @param constraintKey The constraint key from class-validator
   * @returns The validation error message
   */
  private getValidationMessage(field: string, constraintKey: string): string {
    // Map class-validator constraint keys to plain English messages
    const constraintMap: Record<string, string> = {
      isNotEmpty: `${field} is required`,
      isEmail: 'Invalid email format',
      isPhoneNumber: 'Invalid phone number format',
      isStrongPassword: 'Password does not meet strength requirements',
      matches: 'Invalid format',
      minLength: `${field} is too short`,
      maxLength: `${field} is too long`,
      arrayMinSize: 'Not enough items',
      arrayMaxSize: 'Too many items',
      isUuid: 'Invalid UUID format',
      isString: 'Must be a string',
      isBoolean: 'Must be a boolean',
      isEnum: 'Invalid value',
      isDateString: 'Invalid date format',
      isIso8601OrDate: 'Invalid date format',
      isISO8601: 'Invalid date format',
      isArray: 'Must be an array',
      isNumber: 'Must be a number',
      isInt: 'Must be an integer',
      min: `${field} is too small`,
      max: `${field} is too large`,
    };

    return constraintMap[constraintKey] || 'Invalid value';
  }

}
