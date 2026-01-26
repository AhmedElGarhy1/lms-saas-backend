import { Module, forwardRef } from '@nestjs/common';
import { ClassesModule } from '@/modules/classes/classes.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherPayoutRecord } from './entities/teacher-payout-record.entity';
import { TeacherPayoutRecordsRepository } from './repositories/teacher-payout-records.repository';
import { TeacherPayoutService } from './services/teacher-payout.service';
import { TeacherPayoutController } from './controllers/teacher-payout.controller';
import { SessionsListener } from './services/sessions.listener';
import { MonthlyTeacherPayoutJob } from './jobs/monthly-teacher-payout.job';
import { FinanceModule } from '@/modules/finance/finance.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { UserProfileModule } from '../user-profile/user-profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeacherPayoutRecord]),
    forwardRef(() => ClassesModule),
    FinanceModule,
    CentersModule,
    AccessControlModule,
    UserProfileModule,
  ],
  controllers: [TeacherPayoutController],
  providers: [
    TeacherPayoutService,
    TeacherPayoutRecordsRepository,
    SessionsListener,
    MonthlyTeacherPayoutJob,
  ],
  exports: [TeacherPayoutService],
})
export class TeacherPayoutModule {}
