import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Staff } from '../entities/staff.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { UserProfile } from '../entities/user-profile.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Admin } from '../entities/admin.entity';
import { Teacher } from '@/modules/teachers/entities/teacher.entity';
import { Student } from '@/modules/students/entities/student.entity';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class UserProfileRepository extends BaseRepository<UserProfile> {
  constructor(
    private readonly dataSource: DataSource,
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof UserProfile {
    return UserProfile;
  }

  getTargetProfile(userProfileId: string, profileType: ProfileType) {
    return this.getProfileTypeRepository(profileType)
      .createQueryBuilder('profile')
      .leftJoin(UserProfile, 'userProfile', 'userProfile.id = :userProfileId', {
        userProfileId,
      })
      .getOne();
  }

  private getProfileTypeRepository(profileType: ProfileType) {
    // Use transactional entity manager if in a transaction
    const manager = this.getEntityManager();

    switch (profileType) {
      case ProfileType.ADMIN:
        return manager.getRepository(Admin);
      case ProfileType.STAFF:
        return manager.getRepository(Staff);
      case ProfileType.TEACHER:
        return manager.getRepository(Teacher);
      case ProfileType.STUDENT:
        return manager.getRepository(Student);
      // case ProfileType.PARENT:
      //   return manager.getRepository(Parent);
      default:
        throw new Error(`Unknown profile type: ${profileType}`);
    }
  }

  async findUserProfileByType(userId: string, profileType: ProfileType) {
    return this.getRepository().findOne({
      where: { userId, profileType },
    });
  }
}
