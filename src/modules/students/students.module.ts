import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { UserModule } from '@/modules/user/user.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { SharedModule } from '@/shared/shared.module';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { StudentController } from './controllers/student.controller';
import { StudentActionsController } from './controllers/student-actions.controller';
import { StudentService } from './services/student.service';
import { StudentRepository } from './repositories/student.repository';
import { StudentListener } from './listeners/student.listener';
import { StudentActivityListener } from './listeners/student-activity.listener';
import { UserProfileModule } from '../user-profile/user-profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student]),
    forwardRef(() => UserModule),
    forwardRef(() => AccessControlModule),
    forwardRef(() => AuthModule),
    UserProfileModule,
    SharedModule,
    ActivityLogModule,
  ],
  controllers: [StudentController, StudentActionsController],
  providers: [
    StudentService,
    StudentRepository,
    StudentListener,
    StudentActivityListener,
  ],
  exports: [StudentService, StudentRepository],
})
export class StudentsModule {}
