import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { User } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { UserController } from './controllers/user.controller';
import { UserActionsController } from './controllers/user-actions.controller';
import { UserAccessController } from './controllers/user-access.controller';
import { UserService } from './services/user.service';
import { ProfileService } from './services/profile.service';
import { UserRepository } from './repositories/user.repository';

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
