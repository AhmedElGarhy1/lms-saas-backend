import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchAccess } from '../entities/branch-access.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { BranchAccessDto } from '../dto/branch-access.dto';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';

@Injectable()
export class BranchAccessRepository extends BaseRepository<BranchAccess> {
  constructor(
    @InjectRepository(BranchAccess)
    readonly branchAccessRepository: Repository<BranchAccess>,
    protected readonly logger: LoggerService,
  ) {
    super(branchAccessRepository, logger);
  }

  findBranchAccess(data: BranchAccessDto): Promise<BranchAccess | null> {
    return this.branchAccessRepository.findOneBy(data);
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
