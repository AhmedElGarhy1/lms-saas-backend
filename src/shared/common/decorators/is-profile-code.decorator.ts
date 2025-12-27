import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export type IsProfileCodeOptions = {
  /**
   * Restrict allowed prefixes (e.g. ['STU', 'TEA']).
   * If omitted, any 3 uppercase letters are accepted.
   */
  allowedPrefixes?: string[];
};

const PROFILE_CODE_REGEX = /^[A-Z]{3}-\d{2}-\d{6}$/;

export function IsProfileCode(
  options?: IsProfileCodeOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isProfileCode',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          if (!PROFILE_CODE_REGEX.test(value)) return false;

          const prefix = value.slice(0, 3);
          const allowedPrefixes = options?.allowedPrefixes;
          if (allowedPrefixes && allowedPrefixes.length > 0) {
            return allowedPrefixes.includes(prefix);
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const allowedPrefixes = options?.allowedPrefixes;
          if (allowedPrefixes && allowedPrefixes.length > 0) {
            return `"${args.property}" must be a valid profile code (${allowedPrefixes.join('|')}-YY-NNNNNN)`;
          }
          return `"${args.property}" must be a valid profile code (XXX-YY-NNNNNN)`;
        },
      },
    });
  };
}
