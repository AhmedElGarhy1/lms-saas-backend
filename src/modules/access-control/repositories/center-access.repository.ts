import { LoggerService } from '@/shared/services/logger.service';
import { Repository } from 'typeorm';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { CenterAccess } from '../entities/center-access.entity';
import { CenterAccessDto } from '../dto/center-access.dto';

@Injectable()
export class CenterAccessRepository extends BaseRepository<CenterAccess> {
  constructor(
    @InjectRepository(CenterAccess)
    private readonly centerAccessRepository: Repository<CenterAccess>,
    protected readonly logger: LoggerService,
  ) {
    super(centerAccessRepository, logger);
  }

  async findCenterAccess(data: CenterAccessDto): Promise<CenterAccess | null> {
    return this.centerAccessRepository.findOneBy(data);
  }

  async grantCenterAccess(data: CenterAccessDto): Promise<CenterAccess> {
    // Check if access already exists
    const existingAccess = await this.findCenterAccess(data);
    if (existingAccess) {
      throw new ConflictException('Access already exists');
    }

    return this.create(data);
  }

  async revokeCenterAccess(data: CenterAccessDto) {
    const existingAccess = await this.findCenterAccess(data);
    if (!existingAccess) {
      throw new NotFoundException('Access not found');
    }

    return this.centerAccessRepository.remove(existingAccess);
  }

  async getUserCenterAccess(userId: string): Promise<CenterAccess[]> {
    return this.centerAccessRepository.find({
      where: { userId },
      relations: ['center'],
    });
  }

  async getCenterUserAccess(centerId: string): Promise<CenterAccess[]> {
    return this.centerAccessRepository.find({
      where: { centerId },
      relations: ['user'],
    });
  }
}
