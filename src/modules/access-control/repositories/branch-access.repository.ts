import { Injectable } from '@nestjs/common';
import { BranchAccess } from '../entities/branch-access.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { BranchAccessDto } from '../dto/branch-access.dto';
import {
  ResourceNotFoundException,
  ResourceAlreadyExistsException,
} from '@/shared/common/exceptions/custom.exceptions';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class BranchAccessRepository extends BaseRepository<BranchAccess> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof BranchAccess {
    return BranchAccess;
  }

  findBranchAccess(data: BranchAccessDto): Promise<BranchAccess | null> {
    return this.getRepository().findOneBy(data);
  }

  async grantBranchAccess(data: BranchAccessDto) {
    const existingAccess = await this.findBranchAccess(data);
    if (existingAccess) {
      throw new ResourceAlreadyExistsException('t.errors.accessAlreadyExists');
    }

    return this.create({ ...data, isActive: true });
  }

  async revokeBranchAccess(data: BranchAccessDto) {
    const existingAccess = await this.findBranchAccess(data);
    if (!existingAccess) {
      throw new ResourceNotFoundException('t.errors.branchAccessNotFound');
    }

    await this.remove(existingAccess.id);
    return existingAccess;
  }
}
