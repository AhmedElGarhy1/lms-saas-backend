import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { ProfileService } from './services/profile.service';
import { UserRepository } from './repositories/user.repository';
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
  controllers: [UserController],
  providers: [UserService, ProfileService, UserRepository],
  exports: [UserService, ProfileService, UserRepository],
})
export class UserModule {}
