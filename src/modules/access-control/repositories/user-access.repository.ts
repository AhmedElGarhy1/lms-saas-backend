import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
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

  async findUserAccess(granterUserId: string, targetUserId: string) {
    return this.userAccessRepository.findOne({
      where: {
        granterUserId,
        targetUserId,
      },
    });
  }

  async grantUserAccess(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
  }): Promise<void> {
    await this.userAccessRepository.save({
      granterUserId: body.userId,
      targetUserId: body.targetUserId,
      centerId: body.centerId,
    });
  }

  async revokeUserAccess(body: {
    userId: string;
    targetUserId: string;
    centerId?: string;
  }): Promise<void> {
    await this.userAccessRepository.delete({
      granterUserId: body.userId,
      targetUserId: body.targetUserId,
      ...(body.centerId && { centerId: body.centerId }),
    });
  }

  async listUserAccesses(userId: string): Promise<UserAccess[]> {
    return this.userAccessRepository.find({
      where: { granterUserId: userId },
    });
  }

  async findUserAccessesByTargetUserId(
    targetUserId: string,
  ): Promise<UserAccess[]> {
    return this.userAccessRepository.find({
      where: { targetUserId },
    });
  }
}
