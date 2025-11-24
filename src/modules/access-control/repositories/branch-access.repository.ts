import { ConflictException, Injectable } from '@nestjs/common';
import { BranchAccess } from '../entities/branch-access.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { BranchAccessDto } from '../dto/branch-access.dto';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@Injectable()
export class BranchAccessRepository extends BaseRepository<BranchAccess> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly i18n: I18nService<I18nTranslations>,
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
      throw new ConflictException(
        this.i18n.translate('t.errors.accessAlreadyExists'),
      );
    }

    return this.create({ ...data, isActive: true });
  }

  async revokeBranchAccess(data: BranchAccessDto) {
    const existingAccess = await this.findBranchAccess(data);
    if (!existingAccess) {
      throw new ResourceNotFoundException(
        this.i18n.translate('t.errors.branchAccessNotFound'),
      );
    }

    await this.remove(existingAccess.id);
    return existingAccess;
  }
}
