import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function ValidateStartBeforeEnd(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'validateStartBeforeEnd',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(_: any, args: ValidationArguments) {
          const obj = args.object as any;
          if (!obj.startTime || !obj.endTime) return true;
          return new Date(obj.startTime) < new Date(obj.endTime);
        },
        defaultMessage(args: ValidationArguments) {
          return 'startTime must be before endTime';
        },
      },
    });
  };
}
