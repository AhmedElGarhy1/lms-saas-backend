import { forwardRef, Module } from '@nestjs/common';
import { EnrollmentsController } from './controllers/enrollments.controller';
import { EnrollmentService } from './services/enrollment.service';
import { EnrollmentRepository } from './repositories/enrollment.repository';
import { SessionCheckedInListener } from './listeners/session-checked-in.listener';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { PackagesModule } from '../packages/packages.module';
import { SessionsModule } from '../sessions/sessions.module';
import { FinanceModule } from '../finance/finance.module';
import { ClassesModule } from '../classes/classes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment]),
    PackagesModule,
    SessionsModule,
    ClassesModule,
    forwardRef(() => FinanceModule),
  ],
  controllers: [EnrollmentsController],
  providers: [
    EnrollmentService,
    EnrollmentRepository,
    SessionCheckedInListener,
  ],
  exports: [EnrollmentService, EnrollmentRepository],
})
export class EnrollmentsModule {}
