import { forwardRef, Module } from '@nestjs/common';
import { UserModule } from '@/modules/user/user.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { ProfilesController } from './controllers/profiles.controller';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => AccessControlModule),
  ],
  controllers: [ProfilesController],
  providers: [],
  exports: [],
})
export class ProfilesModule {}
