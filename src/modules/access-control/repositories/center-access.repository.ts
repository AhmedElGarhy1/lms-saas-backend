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

@Injectable()
export class CenterAccessRepository extends BaseRepository<CenterAccess> {
  constructor(
    @InjectRepository(CenterAccess)
    private readonly centerAccessRepository: Repository<CenterAccess>,
    protected readonly logger: LoggerService,
  ) {
    super(centerAccessRepository, logger);
  }

  async findCenterAccess(
    userId: string,
    centerId: string,
    global?: boolean,
  ): Promise<CenterAccess | null> {
    const whereCondition: any = { userId, centerId };
    if (global !== undefined) {
      whereCondition.global = global;
    }

    return this.centerAccessRepository.findOne({
      where: whereCondition,
    });
  }

  async grantCenterAccess(
    userId: string,
    centerId: string,
    global: boolean = false,
  ): Promise<CenterAccess> {
    // Check if access already exists
    const existingAccess = await this.findCenterAccess(
      userId,
      centerId,
      global,
    );
    if (existingAccess) {
      throw new ConflictException('Access already exists');
    }

    return this.create({
      userId,
      centerId,
      global,
    });
  }

  async revokeCenterAccess(
    userId: string,
    centerId: string,
    global?: boolean,
  ): Promise<boolean> {
    const whereCondition: any = { userId, centerId };
    if (global !== undefined) {
      whereCondition.global = global;
    }

    const existingAccess = await this.findCenterAccess(
      userId,
      centerId,
      global,
    );
    if (!existingAccess) {
      throw new NotFoundException('Access not found');
    }

    const result = await this.centerAccessRepository.delete(whereCondition);

    return (result.affected ?? 0) > 0;
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
