import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './entities/attendance.entity';
import { AttendanceRepository } from './repositories/attendance.repository';
import { AttendanceService } from './services/attendance.service';
import { AttendanceController } from './controllers/attendance.controller';
import { AttendanceSessionListener } from './listeners/session-finished.listener';
import { SessionsModule } from '@/modules/sessions/sessions.module';
import { ClassesModule } from '@/modules/classes/classes.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { UserModule } from '@/modules/user/user.module';
import { UserProfileModule } from '@/modules/user-profile/user-profile.module';
import { Session } from '@/modules/sessions/entities/session.entity';
import { AttendanceAbsentBackfillJob } from './jobs/attendance-absent-backfill.job';
import { StudentBillingModule } from '@/modules/student-billing/student-billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, Session]),
    forwardRef(() => SessionsModule),
    ClassesModule,
    CentersModule,
    UserModule,
    UserProfileModule,
    StudentBillingModule,
  ],
  controllers: [AttendanceController],
  providers: [
    AttendanceRepository,
    AttendanceService,
    AttendanceSessionListener,
    AttendanceAbsentBackfillJob,
  ],
  exports: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}
