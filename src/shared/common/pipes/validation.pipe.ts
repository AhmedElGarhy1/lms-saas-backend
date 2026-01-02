import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CommonErrors } from '../exceptions/common.errors';

// Performance: Pre-compiled regex patterns
const NUMERIC_EXTRACTOR = /(\d+(?:\.\d+)?)/;
const LENGTH_RANGE_EXTRACTOR = /min.*?(\d+).*?max.*?(\d+)/;
const BYTE_RANGE_EXTRACTOR = /min.*?(\d+).*?max.*?(\d+)/;

/**
 * Custom validation pipe that transforms class-validator errors
 * into structured error responses with constraint codes.
 *
 * Features:
 * - Dual-source parameter extraction (contexts first, regex fallback)
 * - Array index support for nested validation
 * - Performance-optimized regex patterns
 * - Comprehensive constraint parameter extraction
 */
@Injectable()
export class CustomValidationPipe implements PipeTransform {
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

    const object = plainToInstance(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      // Extract constraint names with parameters and array index support
      const validationConstraints = this.extractConstraintNames(errors);

      // Group constraints by field with their parameters
      const groupedConstraints: Record<
        string,
        Array<{ constraint: string; params?: Record<string, any> }>
      > = {};
      for (const item of validationConstraints) {
        if (!groupedConstraints[item.field]) {
          groupedConstraints[item.field] = [];
        }
        groupedConstraints[item.field].push({
          constraint: item.constraint,
          ...(item.params && { params: item.params }),
        });
      }

      throw CommonErrors.validationErrors(groupedConstraints);
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
   * Extracts constraint names with basic parameters from validation errors.
   * Supports array indices for complex nested validation (e.g., phones[2].number).
   *
   * @param errors Array of validation errors
   * @param parentPath Current path in the object hierarchy
   * @param isInArray Whether we're currently processing an array element
   * @returns Array of field-constraint objects with parameters
   */
  private extractConstraintNames(
    errors: ValidationError[],
    parentPath = '',
    isInArray = false,
  ): Array<{
    field: string;
    constraint: string;
    params?: Record<string, any>;
  }> {
    const result: Array<{
      field: string;
      constraint: string;
      params?: Record<string, any>;
    }> = [];

    for (const error of errors) {
      // Build the current field path
      let currentPath: string;

      // Handle array indices - if property is a number and we're in an array context
      if (isInArray && /^\d+$/.test(error.property)) {
        // This is an array element, reconstruct the path
        currentPath = parentPath
          ? `${parentPath}[${error.property}]`
          : `[${error.property}]`;
      } else {
        // Regular property or nested object
        currentPath = parentPath
          ? `${parentPath}.${error.property}`
          : error.property;
      }

      // Process all constraints for this field
      if (error.constraints) {
        const constraintKeys = Object.keys(error.constraints);
        for (const constraintKey of constraintKeys) {
          const params = this.extractBasicConstraintParams(
            constraintKey,
            error,
          );
          result.push({
            field: currentPath,
            constraint: constraintKey,
            ...(params && Object.keys(params).length > 0 && { params }),
          });
        }
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        // Determine if we're entering an array context
        const enteringArray = /^\d+$/.test(error.children[0]?.property || '');
        const nestedConstraints = this.extractConstraintNames(
          error.children,
          currentPath,
          enteringArray,
        );
        result.push(...nestedConstraints);
      }
    }

    return result;
  }

  /**
   * Extracts basic parameters for common constraints using dual-source strategy.
   *
   * Strategy:
   * 1. FIRST: Check error.contexts (developer intent - most reliable)
   * 2. FALLBACK: Regex parsing of constraint messages (automation)
   *
   * This ensures reliability even with custom validation messages.
   */
  private extractBasicConstraintParams(
    constraintKey: string,
    error: ValidationError,
  ): Record<string, any> | undefined {
    // PHASE 1: Check contexts first (developer explicitly provided parameters)
    if (error.contexts && error.contexts[constraintKey]) {
      const contextParams = error.contexts[constraintKey];
      // Ensure we return a plain object
      return typeof contextParams === 'object'
        ? { ...contextParams }
        : { value: contextParams };
    }

    // PHASE 2: Fallback to regex parsing (automation)
    const params: Record<string, any> = {};
    const constraintMessage = error.constraints?.[constraintKey] || '';

    switch (constraintKey) {
      case 'minLength':
      case 'maxLength':
        const lengthMatch = constraintMessage.match(NUMERIC_EXTRACTOR);
        if (lengthMatch) {
          params[constraintKey === 'minLength' ? 'min' : 'max'] = parseInt(
            lengthMatch[1],
            10,
          );
        }
        break;

      case 'min':
      case 'max':
        const valueMatch = constraintMessage.match(NUMERIC_EXTRACTOR);
        if (valueMatch) {
          params[constraintKey] = parseFloat(valueMatch[1]);
        }
        break;

      case 'arrayMinSize':
      case 'arrayMaxSize':
        const arraySizeMatch = constraintMessage.match(NUMERIC_EXTRACTOR);
        if (arraySizeMatch) {
          params[constraintKey === 'arrayMinSize' ? 'min' : 'max'] = parseInt(
            arraySizeMatch[1],
            10,
          );
        }
        break;

      case 'length':
        const rangeMatch = constraintMessage.match(LENGTH_RANGE_EXTRACTOR);
        if (rangeMatch) {
          params.min = parseInt(rangeMatch[1], 10);
          params.max = parseInt(rangeMatch[2], 10);
        }
        break;

      case 'isDivisibleBy':
        const divisibleMatch = constraintMessage.match(NUMERIC_EXTRACTOR);
        if (divisibleMatch) {
          params.divisor = parseFloat(divisibleMatch[1]);
        }
        break;

      case 'isByteLength':
        const byteRangeMatch = constraintMessage.match(BYTE_RANGE_EXTRACTOR);
        if (byteRangeMatch) {
          params.minBytes = parseInt(byteRangeMatch[1], 10);
          params.maxBytes = parseInt(byteRangeMatch[2], 10);
        }
        break;

      case 'isEnum':
        // Extract enum values from message: "must be one of the following values: admin, user"
        const enumPart = constraintMessage.split(': ')[1];
        if (enumPart) {
          params.allowedValues = enumPart.split(', ').map((v) => v.trim());
        }
        break;

      case 'matches':
        // For regex patterns, client needs to know from DTO
        break;

      case 'isIn':
      case 'isNotIn':
        // Extract allowed/forbidden values if present in message
        const valuesPart = constraintMessage.split(': ')[1];
        if (valuesPart) {
          params.values = valuesPart.split(', ').map((v) => v.trim());
        }
        break;

      case 'arrayContains':
      case 'arrayNotContains':
        // Try to extract required values from message
        const arrayValuesPart = constraintMessage.split(': ')[1];
        if (arrayValuesPart) {
          params.requiredValues = arrayValuesPart
            .split(', ')
            .map((v) => v.trim());
        }
        break;

      // Other constraints like isEmail, isNotEmpty, isString, etc. don't need parameters
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }
}
