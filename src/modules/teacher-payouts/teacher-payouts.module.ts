import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherPayoutRecord } from './entities/teacher-payout-record.entity';
import { TeacherPayoutRecordsRepository } from './repositories/teacher-payout-records.repository';
import { TeacherPayoutService } from './services/teacher-payout.service';
import { TeacherPayoutController } from './controllers/teacher-payout.controller';
import { SessionsListener } from './services/sessions.listener';
import { ClassesModule } from '@/modules/classes/classes.module';
import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { FinanceModule } from '@/modules/finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeacherPayoutRecord]),
    ClassesModule, // For PaymentStrategyService
    AttendanceModule, // For AttendanceRepository
    FinanceModule, // For PaymentService, WalletService
  ],
  controllers: [TeacherPayoutController],
  providers: [
    TeacherPayoutService,
    TeacherPayoutRecordsRepository,
    SessionsListener,
  ],
  exports: [TeacherPayoutService],
})
export class TeacherPayoutModule {}
