import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { Admin } from '../entities/admin.entity';

@Injectable()
export class AdminRepository extends BaseRepository<Admin> {
  constructor(
    @InjectRepository(Admin)
    readonly adminRepository: Repository<Admin>,
    protected readonly logger: LoggerService,
  ) {
    super(adminRepository, logger);
  }

  async createAndSave(adminData: Partial<Admin>): Promise<Admin> {
    const admin = this.repository.create(adminData);
    return this.repository.save(admin);
  }

  async findById(id: string): Promise<Admin | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async updateById(id: string, adminData: Partial<Admin>): Promise<void> {
    await this.repository.update(id, adminData);
  }

  async softDeleteById(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
