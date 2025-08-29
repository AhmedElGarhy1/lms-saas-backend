import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
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
    });

    if (errors.length > 0) {
      const validationErrors: ErrorDetail[] = errors.map((error) => ({
        field: error.property,
        value: error.value,
        message: Object.values(error.constraints || {}).join(', '),
        code: 'VALIDATION_ERROR',
        suggestion: this.getValidationSuggestion(
          error.property,
          error.constraints,
        ),
      }));

      this.logger.warn('Validation failed', {
        errors: validationErrors,
        value,
        metatype: metatype.name,
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

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private getValidationSuggestion(field: string, constraints: any): string {
    if (constraints.isEmail) return 'Please enter a valid email address';
    if (constraints.minLength)
      return `Must be at least ${constraints.minLength} characters`;
    if (constraints.maxLength)
      return `Must be no more than ${constraints.maxLength} characters`;
    if (constraints.isNotEmpty) return 'This field is required';
    if (constraints.isUrl) return 'Please enter a valid URL';
    if (constraints.isEnum) return `Please select a valid option for ${field}`;
    if (constraints.isNumber) return `Please enter a valid number for ${field}`;
    if (constraints.isBoolean) return `Please select yes or no for ${field}`;
    if (constraints.isDate) return `Please enter a valid date for ${field}`;
    if (constraints.isArray)
      return `Please provide a list of items for ${field}`;
    if (constraints.isObject) return `Please provide valid data for ${field}`;
    return 'Please check this field';
  }
}
