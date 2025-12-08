import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserInfo } from './entities/user-info.entity';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserProfileModule } from '@/modules/user-profile/user-profile.module';
import { UserController } from './controllers/user.controller';
import { UserAccessController } from './controllers/user-access.controller';
import { UserService } from './services/user.service';
import { UserInfoService } from './services/user-info.service';
import { UserRepository } from './repositories/user.repository';
import { UserInfoRepository } from './repositories/user-info.repository';
import { UserActivityListener } from './listeners//user-activity.listener';
import { ClassesModule } from '../classes/classes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserInfo]),
    forwardRef(() => AccessControlModule),
    forwardRef(() => CentersModule),
    forwardRef(() => AuthModule),
    forwardRef(() => UserProfileModule),
    ClassesModule,
    ActivityLogModule,
  ],
  controllers: [UserController, UserAccessController],
  providers: [
    UserService,
    UserInfoService,
    UserRepository,
    UserInfoRepository,
    UserActivityListener,
  ],
  exports: [UserService, UserInfoService, UserRepository, UserInfoRepository],
})
export class UserModule {}
