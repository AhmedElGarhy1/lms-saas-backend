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

  async findUserAccess(data: UserAccessDto) {
    return this.userAccessRepository.findOneBy({
      granterUserProfileId: data.granterUserProfileId,
      targetUserProfileId: data.targetUserProfileId,
      ...(data.centerId && { centerId: data.centerId }),
    });
  }

  async grantUserAccess(body: UserAccessDto): Promise<void> {
    const userAccess = this.userAccessRepository.create({
      granterUserProfileId: body.granterUserProfileId,
      targetUserProfileId: body.targetUserProfileId,
      ...(body.centerId && { centerId: body.centerId }),
    });
    await this.userAccessRepository.save(userAccess);
  }

  async revokeUserAccess(body: UserAccessDto): Promise<void> {
    const userAccess = await this.userAccessRepository.findOne({
      where: {
        granterUserProfileId: body.granterUserProfileId,
        targetUserProfileId: body.targetUserProfileId,
        ...(body.centerId && { centerId: body.centerId }),
      },
    });
    if (!userAccess) throw new NotFoundException('User access not found');
    await this.userAccessRepository.remove(userAccess);
  }

  async listUserAccesses(userProfileId: string): Promise<UserAccess[]> {
    return this.userAccessRepository.find({
      where: { granterUserProfileId: userProfileId },
    });
  }
}
