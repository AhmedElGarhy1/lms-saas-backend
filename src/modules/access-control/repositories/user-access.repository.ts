import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { UserAccess } from '../entities/user-access.entity';
import { LoggerService } from '../../../shared/services/logger.service';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';

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

  async grantUserAccess(body: UserAccessDto): Promise<void> {
    const userAccess = this.userAccessRepository.create({
      granterUserId: body.granterUserId,
      targetUserId: body.targetUserId,
      ...(body.centerId && { centerId: body.centerId }),
      createdBy: body.granterUserId,
    });
    await this.userAccessRepository.save(userAccess);
  }

  async revokeUserAccess(body: UserAccessDto): Promise<void> {
    const userAccess = await this.userAccessRepository.findOne({
      where: {
        granterUserId: body.granterUserId,
        targetUserId: body.targetUserId,
        ...(body.centerId && { centerId: body.centerId }),
      },
    });
    if (!userAccess) throw new NotFoundException('User access not found');
    await this.userAccessRepository.remove(userAccess);
  }

  async listUserAccesses(userId: string): Promise<UserAccess[]> {
    return this.userAccessRepository.find({
      where: { granterUserId: userId },
    });
  }
}
