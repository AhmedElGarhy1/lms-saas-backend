import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserInfo } from './entities/user-info.entity';
import { UserDevice } from './entities/user-device.entity';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserProfileModule } from '@/modules/user-profile/user-profile.module';
import { UserController } from './controllers/user.controller';
import { UserAccessController } from './controllers/user-access.controller';
import { LocaleController } from './controllers/locale.controller';
import { UserService } from './services/user.service';
import { UserInfoService } from './services/user-info.service';
import { LocaleService } from './services/locale.service';
import { DeviceService } from './services/device.service';
import { UserRepository } from './repositories/user.repository';
import { UserInfoRepository } from './repositories/user-info.repository';
import { UserDeviceRepository } from './repositories/user-device.repository';
import { ClassesModule } from '../classes/classes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserInfo, UserDevice]),
    forwardRef(() => AccessControlModule),
    forwardRef(() => CentersModule),
    forwardRef(() => AuthModule),
    forwardRef(() => UserProfileModule),
    ClassesModule,
  ],
  controllers: [UserController, UserAccessController, LocaleController],
  providers: [
    UserService,
    UserInfoService,
    LocaleService,
    DeviceService,
    UserRepository,
    UserInfoRepository,
    UserDeviceRepository,
  ],
  exports: [
    UserService,
    UserInfoService,
    LocaleService,
    DeviceService,
    UserRepository,
    UserInfoRepository,
    UserDeviceRepository,
  ],
})
export class UserModule {}
