import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserInfo } from './entities/user-info.entity';
import { UserProfile } from './entities/user-profile.entity';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { UserController } from './controllers/user.controller';
import { UserAccessController } from './controllers/user-access.controller';
import { UserService } from './services/user.service';
import { UserInfoService } from './services/user-info.service';
import { UserProfileService } from './services/user-profile.service';
import { UserRepository } from './repositories/user.repository';
import { UserInfoRepository } from './repositories/user-info.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { UserActivityLogListener } from './listeners/user-activity-log.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserInfo, UserProfile]),
    forwardRef(() => AccessControlModule),
    forwardRef(() => CentersModule),
    ActivityLogModule,
  ],
  controllers: [UserAccessController, UserController],
  providers: [
    UserService,
    UserInfoService,
    UserProfileService,
    UserRepository,
    UserInfoRepository,
    UserProfileRepository,
    UserActivityLogListener,
  ],
  exports: [
    UserService,
    UserInfoService,
    UserProfileService,
    UserRepository,
    UserInfoRepository,
    UserProfileRepository,
  ],
})
export class UserModule {}
