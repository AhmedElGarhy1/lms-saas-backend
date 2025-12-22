import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
// Import entities from classes module (entities only, not full module)
import { Group } from '@/modules/classes/entities/group.entity';
import { ScheduleItem } from '@/modules/classes/entities/schedule-item.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { ClassesModule } from '@/modules/classes/classes.module';
import { SharedModule } from '@/shared/shared.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { SessionsController } from './controllers/sessions.controller';
import { SessionsService } from './services/sessions.service';
import { SessionsRepository } from './repositories/sessions.repository';
import { SessionGenerationService } from './services/session-generation.service';
import { SessionValidationService } from './services/session-validation.service';
import { SessionGenerationMaintenanceJob } from './jobs/session-generation-maintenance.job';
import { SessionCleanupJob } from './jobs/session-cleanup.job';
import { SessionActivityListener } from './listeners/session-activity.listener';
import { GroupEventsListener } from './listeners/group-events.listener';
import { ClassEventsListener } from './listeners/class-events.listener';
import { SessionPaymentListener } from './listeners/session-payment-listener';
import { SessionAttendanceListener } from './listeners/session-attendance-listener';

@Module({
  imports: [
    // Import entities for TypeORM
    TypeOrmModule.forFeature([Session, Group, ScheduleItem, Class]),
    // Import ClassesModule to access repositories (using forwardRef to handle potential circular dependencies)
    forwardRef(() => ClassesModule),
    SharedModule, // For TypeSafeEventEmitter, ActivityLogModule, etc.
    AccessControlModule, // For permissions
  ],
  controllers: [SessionsController],
  providers: [
    // Repositories
    SessionsRepository,
    // Services
    SessionsService,
    SessionGenerationService,
    SessionValidationService,
    // Jobs
    SessionGenerationMaintenanceJob,
    SessionCleanupJob,
    // Listeners
    SessionActivityListener,
    GroupEventsListener,
    ClassEventsListener,
    SessionPaymentListener,
    SessionAttendanceListener,
  ],
  exports: [SessionsService, SessionsRepository],
})
export class SessionsModule {}
