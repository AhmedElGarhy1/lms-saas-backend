import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import {
  UserController,
  UserActionsController,
  UserAccessController,
} from './controllers';
import { UserService, ProfileService } from './services';
import { UserRepository } from './repositories';
import { User, Profile } from './entities';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { CentersModule } from '@/modules/centers/centers.module';

@Module({
  imports: [
    WinstonModule,
    TypeOrmModule.forFeature([User, Profile]),
    AccessControlModule,
    forwardRef(() => CentersModule),
  ],
  controllers: [UserController, UserActionsController, UserAccessController],
  providers: [UserService, ProfileService, UserRepository],
  exports: [UserService, ProfileService, UserRepository],
})
export class UserModule {}
