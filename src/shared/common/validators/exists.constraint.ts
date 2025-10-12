import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { DataSource } from 'typeorm';

@ValidatorConstraint({ async: true })
@Injectable()
export class ExistsConstraint implements ValidatorConstraintInterface {
  constructor(private readonly dataSource: DataSource) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const [entityClass, column = 'id'] = args.constraints as [any, string];
    if (!value) return false;

    const repo = this.dataSource.getRepository(entityClass);
    const exists = await repo.exists({ where: { [column]: value } });
    return !!exists;
  }

  defaultMessage(args: ValidationArguments): string {
    const [entityClass, column = 'id'] = args.constraints as [any, string];
    return `${entityClass.name} with ${column} "${args.value}" does not exist`;
  }
}
