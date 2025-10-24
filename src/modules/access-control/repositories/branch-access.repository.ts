import { ConflictException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BranchAccess } from '../entities/branch-access.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { BranchAccessDto } from '../dto/branch-access.dto';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class BranchAccessRepository extends BaseRepository<BranchAccess> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
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
      throw new ConflictException('Access already exists');
    }

    return this.create({ ...data, isActive: true });
  }

  async revokeBranchAccess(data: BranchAccessDto) {
    const existingAccess = await this.findBranchAccess(data);
    if (!existingAccess) {
      throw new ResourceNotFoundException('Branch access not found');
    }

    await this.remove(existingAccess.id);
    return existingAccess;
  }
}
