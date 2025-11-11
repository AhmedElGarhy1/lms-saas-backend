import { Injectable } from '@nestjs/common';
import { Staff } from '../entities/staff.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class StaffRepository extends BaseRepository<Staff> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Staff {
    return Staff;
  }

  // Staff-specific repository methods can be added here as needed
}
