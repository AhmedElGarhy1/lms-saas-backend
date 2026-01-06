import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { Group } from '@/modules/classes/entities/group.entity';
import { ScheduleItem } from '@/modules/classes/entities/schedule-item.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { ClassesModule } from '@/modules/classes/classes.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { SessionsController } from './controllers/sessions.controller';
import { SessionsService } from './services/sessions.service';
import { SessionsRepository } from './repositories/sessions.repository';
import { SessionValidationService } from './services/session-validation.service';
import { SessionPaymentListener } from './listeners/session-payment-listener';
import { SessionVirtualizationService } from './services/session-virtualization.service';
import { SessionsCleanupJob } from './jobs/sessions-cleanup.job';
import { SessionStateMachine } from './state-machines/session-state-machine';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Group, ScheduleItem, Class]),
    forwardRef(() => ClassesModule),
    CentersModule,
  ],
  controllers: [SessionsController],
  providers: [
    SessionsRepository,
    SessionsService,
    SessionValidationService,
    SessionVirtualizationService,
    SessionStateMachine,
    SessionsCleanupJob,
    SessionPaymentListener,
  ],
  exports: [SessionsService, SessionsRepository],
})
export class SessionsModule {}
