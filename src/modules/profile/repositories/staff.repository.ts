import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../entities/staff.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class StaffRepository extends BaseRepository<Staff> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof Staff {
    return Staff;
  }

  async createAndSave(staffData: Partial<Staff>): Promise<Staff> {
    const repo = this.getRepository();
    const staff = repo.create(staffData);
    return repo.save(staff);
  }

  async findById(id: string): Promise<Staff | null> {
    return this.getRepository().findOne({
      where: { id },
    });
  }

  async updateById(id: string, staffData: Partial<Staff>): Promise<void> {
    await this.getRepository().update(id, staffData);
  }

  async softDeleteById(id: string): Promise<void> {
    await this.getRepository().softDelete(id);
  }
}
