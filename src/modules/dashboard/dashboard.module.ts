import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CentersModule } from '../centers/centers.module';
import { FinanceModule } from '../finance/finance.module';
import { TeacherPayoutModule } from '../teacher-payouts/teacher-payouts.module';
import { StudentBillingModule } from '../student-billing/student-billing.module';
import { ClassesModule } from '../classes/classes.module';
import { StudentsModule } from '../students/students.module';
import { TeachersModule } from '../teachers/teachers.module';
import { StaffModule } from '../staff/staff.module';
import { SessionsModule } from '../sessions/sessions.module';
import { SharedModule } from '@/shared/shared.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { CenterDashboardController } from './controllers/center-dashboard.controller';
import { CenterDashboardService } from './services/center-dashboard.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    CentersModule,
    UserModule,
    FinanceModule,
    TeacherPayoutModule,
    ClassesModule,
    StudentsModule,
    TeachersModule,
    StaffModule,
    SessionsModule,
    SharedModule,
    AccessControlModule,
  ],
  controllers: [CenterDashboardController],
  providers: [CenterDashboardService],
  exports: [CenterDashboardService],
})
export class DashboardModule {}