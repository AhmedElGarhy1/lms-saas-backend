import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from './entities/teacher.entity';
import { UserModule } from '@/modules/user/user.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { SharedModule } from '@/shared/shared.module';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { TeacherController } from './controllers/teacher.controller';
import { TeacherActionsController } from './controllers/teacher-actions.controller';
import { TeacherService } from './services/teacher.service';
import { TeacherRepository } from './repositories/teacher.repository';
import { TeacherListener } from './listeners/teacher.listener';
import { TeacherActivityListener } from './listeners/teacher-activity.listener';
import { UserProfileModule } from '../user-profile/user-profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Teacher]),
    UserModule,
    AccessControlModule,
    AuthModule,
    UserProfileModule,
    SharedModule,
    ActivityLogModule,
  ],
  controllers: [TeacherController, TeacherActionsController],
  providers: [
    TeacherService,
    TeacherRepository,
    TeacherListener,
    TeacherActivityListener,
  ],
  exports: [TeacherService, TeacherRepository],
})
export class TeachersModule {}
