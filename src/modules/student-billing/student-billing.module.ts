import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentBillingService } from './services/student-billing.service';
import { StudentBillingRefundService } from './services/student-billing-refund.service';
import { StudentBillingValidationService } from './services/student-billing-validation.service';
import { StudentBillingQueryService } from './services/student-billing-query.service';
import { StudentBillingController } from './controllers/student-billing.controller';
import { StudentCharge } from './entities/student-charge.entity';
import { StudentChargesRepository } from './repositories/student-charges.repository';
import { FinanceModule } from '@/modules/finance/finance.module';
import { SessionsModule } from '@/modules/sessions/sessions.module';
import { ClassesModule } from '@/modules/classes/classes.module';
import { CentersModule } from '../centers/centers.module';
import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { UserProfileModule } from '../user-profile/user-profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentCharge]),
    FinanceModule,
    forwardRef(() => SessionsModule),
    forwardRef(() => ClassesModule),
    CentersModule,
    forwardRef(() => AttendanceModule),
    UserProfileModule,
  ],
  controllers: [StudentBillingController],
  providers: [
    StudentBillingService,
    StudentBillingRefundService,
    StudentBillingValidationService,
    StudentBillingQueryService,
    StudentChargesRepository,
  ],
  exports: [
    StudentBillingService,
    StudentBillingRefundService,
    StudentBillingValidationService,
    StudentBillingQueryService,
  ],
})
export class StudentBillingModule {}
