import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ValidatorConstraint({ async: true })
@Injectable()
export class NotExistsConstraint implements ValidatorConstraintInterface {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const [entityClass, column = 'id'] = args.constraints as [any, string];
    if (!value) return true; // Allow empty values for optional fields

    // Check if dataSource is available
    if (!this.dataSource) {
      console.error('DataSource is not available in NotExistsConstraint');
      return false;
    }

    try {
      const repo = this.dataSource.getRepository(entityClass);
      const exists = await repo.exists({ where: { [column]: value } });
      // Return true if it does NOT exist (validation passes)
      return !exists;
    } catch (error) {
      // Log the error for debugging but don't throw
      console.error('Error in NotExistsConstraint:', error);
      // Return false to indicate validation failure, not an internal error
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const [entityClass, column = 'id'] = args.constraints as [any, string];
    return `${entityClass.name} with ${column} "${args.value}" already exists`;
  }
}
