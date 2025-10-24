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

@Injectable()
export class UserProfileRepository extends BaseRepository<UserProfile> {
  constructor(
    @InjectRepository(UserProfile)
    readonly userProfileRepository: Repository<UserProfile>,
    private readonly dataSource: DataSource,
    protected readonly logger: LoggerService,
  ) {
    super(userProfileRepository, logger);
  }

  getTargetProfile(userProfileId: string, profileType: ProfileType) {
    return this.getRepository(profileType)
      .createQueryBuilder('profile')
      .leftJoin(UserProfile, 'userProfile', 'userProfile.id = :userProfileId', {
        userProfileId,
      })
      .getOne();
  }

  private getRepository(profileType: ProfileType) {
    switch (profileType) {
      case ProfileType.ADMIN:
        return this.dataSource.getRepository(Admin);
      case ProfileType.STAFF:
        return this.dataSource.getRepository(Staff);
      case ProfileType.TEACHER:
        return this.dataSource.getRepository(Teacher);
      case ProfileType.STUDENT:
        return this.dataSource.getRepository(Student);
      // case ProfileType.PARENT:
      //   return this.dataSource.getRepository(Parent);
      default:
        throw new Error(`Unknown profile type: ${profileType}`);
    }
  }
}
