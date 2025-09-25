import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserActivationService } from './services/user-activation.service';
import { ProfileService } from './services/profile.service';
import { UserRepository } from './repositories/user.repository';
import { User, Profile, UserAccess } from './entities';

import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { UserEventEmitter } from '@/shared/common/events/user.events';
import { CentersModule } from '@/modules/centers/centers.module';

@Module({
  imports: [
    WinstonModule,
    TypeOrmModule.forFeature([User, Profile, UserAccess]),
    AccessControlModule,
    CentersModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserActivationService,
    ProfileService,
    UserRepository,
    {
      provide: UserEventEmitter,
      useClass: UserEventEmitter,
    },
  ],
  exports: [UserService, UserActivationService, ProfileService, UserRepository],
})
export class UserModule {}
