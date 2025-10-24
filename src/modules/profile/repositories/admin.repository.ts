import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { Admin } from '../entities/admin.entity';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class AdminRepository extends BaseRepository<Admin> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof Admin {
    return Admin;
  }

  async createAndSave(adminData: Partial<Admin>): Promise<Admin> {
    const admin = this.getRepository().create(adminData);
    return this.getRepository().save(admin);
  }

  async findById(id: string): Promise<Admin | null> {
    return this.getRepository().findOne({
      where: { id },
    });
  }

  async updateById(id: string, adminData: Partial<Admin>): Promise<void> {
    await this.getRepository().update(id, adminData);
  }

  async softDeleteById(id: string): Promise<void> {
    await this.getRepository().softDelete(id);
  }
}
