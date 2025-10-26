import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserInfo } from './entities/user-info.entity';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { UserController } from './controllers/user.controller';
import { UserActionsController } from './controllers/user-actions.controller';
import { UserAccessController } from './controllers/user-access.controller';
import { UserService } from './services/user.service';
import { UserInfoService } from './services/user-info.service';
import { UserRepository } from './repositories/user.repository';
import { UserInfoRepository } from './repositories/user-info.repository';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserInfo]),
    forwardRef(() => AccessControlModule),
    forwardRef(() => CentersModule),
    ProfileModule,
  ],
  controllers: [UserActionsController, UserAccessController, UserController],
  providers: [UserService, UserInfoService, UserRepository, UserInfoRepository],
  exports: [UserService, UserInfoService, UserRepository, UserInfoRepository],
})
export class UserModule {}
