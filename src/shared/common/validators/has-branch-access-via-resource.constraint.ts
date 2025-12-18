import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { RequestContext } from '../context/request.context';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class HasBranchAccessViaResourceConstraint
  implements ValidatorConstraintInterface
{
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const [entityClass] = args.constraints as [EntityTarget<ObjectLiteral>];
    const context = RequestContext.get();
    const centerId = context?.centerId;
    const userProfileId = context?.userProfileId;

    if (!value) return true;
    if (!centerId || !userProfileId) return false;

    if (!this.dataSource) {
      console.error(
        'DataSource is not available in HasBranchAccessViaResourceConstraint',
      );
      return false;
    }

    try {
      const repo = this.dataSource.getRepository(entityClass);
      const entity = await repo.findOne({ where: { id: value } });

      if (!entity) return false;

      const entityBranchId = (entity as { branchId?: string }).branchId;
      if (!entityBranchId) return false;

      const branchRepo = this.dataSource.getRepository('Branch');
      const branch = await branchRepo.findOne({
        where: { id: entityBranchId },
      });

      if (!branch) return false;

      const branchCenterId = (branch as { centerId?: string }).centerId;
      if (branchCenterId !== centerId) return false;

      return await this.branchAccessService.canBranchAccess({
        userProfileId,
        centerId,
        branchId: entityBranchId,
      });
    } catch (error) {
      console.error('Error in HasBranchAccessViaResourceConstraint:', error);
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const [entityClass] = args.constraints as [EntityTarget<ObjectLiteral>];
    return `${entityClass.constructor.name} with id "${args.value}" does not belong to a branch in the current center, or actor does not have branch access`;
  }
}
