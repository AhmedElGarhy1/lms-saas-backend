import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { UserAccess } from '../../user/entities/user-access.entity';
import { LoggerService } from '../../../shared/services/logger.service';

@Injectable()
export class UserAccessRepository extends BaseRepository<UserAccess> {
  constructor(
    @InjectRepository(UserAccess)
    private readonly userAccessRepository: Repository<UserAccess>,
    protected readonly logger: LoggerService,
  ) {
    super(userAccessRepository, logger);
  }

  async findUserAccess(
    granterUserId: string,
    targetUserId: string,
    centerId?: string,
  ) {
    return this.userAccessRepository.findOne({
      where: {
        granterUserId,
        targetUserId,
        ...(centerId && { centerId }),
      },
    });
  }

  async grantUserAccess(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
    granterUserId: string;
  }): Promise<void> {
    const userAccess = this.userAccessRepository.create({
      granterUserId: body.granterUserId,
      targetUserId: body.targetUserId,
      ...(body.centerId && { centerId: body.centerId }),
      createdBy: body.granterUserId,
    });
    await this.userAccessRepository.save(userAccess);
  }

  async revokeUserAccess(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
    granterUserId: string;
  }): Promise<void> {
    await this.userAccessRepository.delete({
      granterUserId: body.granterUserId,
      targetUserId: body.targetUserId,
      ...(body.centerId && { centerId: body.centerId }),
    });
  }

  async listUserAccesses(userId: string): Promise<UserAccess[]> {
    return this.userAccessRepository.find({
      where: { granterUserId: userId },
    });
  }
}
