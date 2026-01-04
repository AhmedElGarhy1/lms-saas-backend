import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentBillingService } from './services/student-billing.service';
import { StudentBillingController } from './controllers/student-billing.controller';
import { StudentClassSubscription } from './entities/student-class-subscription.entity';
import { StudentSessionCharge } from './entities/student-session-charge.entity';
import { StudentClassCharge } from './entities/student-class-charge.entity';
import { StudentBillingRecord } from './entities/student-billing-record.entity';
import { StudentBillingRecordsRepository } from './repositories/student-billing-records.repository';
import { StudentClassSubscriptionsRepository } from './repositories/student-class-subscriptions.repository';
import { StudentSessionChargesRepository } from './repositories/student-session-charges.repository';
import { StudentClassChargesRepository } from './repositories/student-class-charges.repository';
import { FinanceModule } from '@/modules/finance/finance.module';
import { SessionsModule } from '@/modules/sessions/sessions.module';
import { ClassesModule } from '@/modules/classes/classes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentClassSubscription,
      StudentSessionCharge,
      StudentClassCharge,
      StudentBillingRecord,
    ]),
    FinanceModule,
    forwardRef(() => SessionsModule),
    forwardRef(() => ClassesModule),
  ],
  controllers: [StudentBillingController],
  providers: [
    StudentBillingService,
    StudentBillingRecordsRepository,
    StudentClassSubscriptionsRepository,
    StudentSessionChargesRepository,
    StudentClassChargesRepository,
  ],
  exports: [StudentBillingService],
})
export class StudentBillingModule {}
