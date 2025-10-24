import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../entities/staff.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';

@Injectable()
export class StaffRepository extends BaseRepository<Staff> {
  constructor(
    @InjectRepository(Staff)
    readonly staffRepository: Repository<Staff>,
    protected readonly logger: LoggerService,
  ) {
    super(staffRepository, logger);
  }

  async createAndSave(staffData: Partial<Staff>): Promise<Staff> {
    const staff = this.repository.create(staffData);
    return this.repository.save(staff);
  }

  async findById(id: string): Promise<Staff | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async updateById(id: string, staffData: Partial<Staff>): Promise<void> {
    await this.repository.update(id, staffData);
  }

  async softDeleteById(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
