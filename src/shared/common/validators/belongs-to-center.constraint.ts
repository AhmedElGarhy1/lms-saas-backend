import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { RequestContext } from '../context/request.context';

@ValidatorConstraint({ async: true })
@Injectable()
export class BelongsToCenterConstraint implements ValidatorConstraintInterface {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const [entityClass, includeDeleted = false] = args.constraints as [
      EntityTarget<ObjectLiteral>,
      boolean,
    ];
    const centerId = RequestContext.get()?.centerId;

    if (!value) return true;
    if (!centerId) return false;

    if (!this.dataSource) {
      console.error('DataSource is not available in BelongsToCenterConstraint');
      return false;
    }

    try {
      const repo = this.dataSource.getRepository(entityClass);
      const entity = await repo.findOne({
        where: { id: value },
        withDeleted: includeDeleted,
      });

      if (!entity) return false;

      return (entity as { centerId?: string }).centerId === centerId;
    } catch (error) {
      console.error('Error in BelongsToCenterConstraint:', error);
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const [entityClass, includeDeleted = false] = args.constraints as [
      EntityTarget<ObjectLiteral>,
      boolean,
    ];
    const entityType = includeDeleted ? 'deleted ' : '';
    return `${entityType}${entityClass.constructor.name} with id "${args.value}" does not belong to the current center`;
  }
}
