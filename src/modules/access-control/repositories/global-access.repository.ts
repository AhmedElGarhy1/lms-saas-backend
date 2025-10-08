import { LoggerService } from '@/shared/services/logger.service';
import { Repository } from 'typeorm';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { GlobalAccess } from '../entities/global-access.entity';

@Injectable()
export class GlobalAccessRepository extends BaseRepository<GlobalAccess> {
  constructor(
    @InjectRepository(GlobalAccess)
    private readonly globalAccessRepository: Repository<GlobalAccess>,

    protected readonly logger: LoggerService,
  ) {
    super(globalAccessRepository, logger);
  }

  async findGlobalAccess(
    userId: string,
    centerId: string,
  ): Promise<GlobalAccess | null> {
    return this.globalAccessRepository.findOne({
      where: { userId, centerId },
    });
  }

  async grantGlobalAccess(
    userId: string,
    centerId: string,
  ): Promise<GlobalAccess> {
    // Check if access already exists
    const existingAccess = await this.findGlobalAccess(userId, centerId);
    if (existingAccess) {
      throw new ConflictException('Access already exists');
    }

    return this.create({
      userId,
      centerId,
    });
  }

  async revokeGlobalAccess(userId: string, centerId: string) {
    const existingAccess = await this.findGlobalAccess(userId, centerId);
    if (!existingAccess) {
      throw new NotFoundException('Access not found');
    }

    return this.remove(existingAccess.id);
  }
}
