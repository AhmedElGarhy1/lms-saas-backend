import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

@ValidatorConstraint({ async: true })
@Injectable()
export class ExistsConstraint implements ValidatorConstraintInterface {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const [entityClass, column = 'id', includeDeleted = false] = args.constraints as [
      EntityTarget<ObjectLiteral>,
      string,
      boolean,
    ];
    if (!value) return true;

    if (!this.dataSource) {
      console.error('DataSource is not available in ExistsConstraint');
      return false;
    }

    try {
      const repo = this.dataSource.getRepository(entityClass);
      const exists = await repo.exists({
        where: { [column]: value },
        withDeleted: includeDeleted,
      });
      return !!exists;
    } catch (error) {
      console.error('Error in ExistsConstraint:', error);
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const [entityClass, column = 'id', includeDeleted = false] = args.constraints as [
      EntityTarget<ObjectLiteral>,
      string,
      boolean,
    ];
    const entityType = includeDeleted ? 'deleted ' : '';
    return `${entityType}${entityClass.constructor.name} with ${column} "${args.value}" does not exist`;
  }
}
