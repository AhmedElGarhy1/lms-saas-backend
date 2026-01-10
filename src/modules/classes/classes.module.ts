import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { Group } from './entities/group.entity';
import { ScheduleItem } from './entities/schedule-item.entity';
import { GroupStudent } from './entities/group-student.entity';
import { StudentPaymentStrategy } from './entities/student-payment-strategy.entity';
import { TeacherPaymentStrategy } from './entities/teacher-payment-strategy.entity';
import { ClassStaff } from './entities/class-staff.entity';
import { ClassesService } from './services/classes.service';
import { GroupsService } from './services/groups.service';
import { GroupScheduleService } from './services/group-schedule.service';
import { GroupStudentService } from './services/group-student.service';
import { ScheduleService } from './services/schedule.service';
import { ClassValidationService } from './services/class-validation.service';
import { GroupValidationService } from './services/group-validation.service';
import { PaymentStrategyService } from './services/payment-strategy.service';
import { ClassStaffService } from './services/class-staff.service';
import { ClassAccessService } from './services/class-access.service';
import { ClassesRepository } from './repositories/classes.repository';
import { GroupsRepository } from './repositories/groups.repository';
import { ScheduleItemsRepository } from './repositories/schedule-items.repository';
import { GroupStudentsRepository } from './repositories/group-students.repository';
import { StudentPaymentStrategyRepository } from './repositories/student-payment-strategy.repository';
import { TeacherPaymentStrategyRepository } from './repositories/teacher-payment-strategy.repository';
import { ClassStaffRepository } from './repositories/class-staff.repository';
import { ClassesController } from './controllers/classes.controller';
import { ClassesActionsController } from './controllers/classes-actions.controller';
import { GroupsController } from './controllers/groups.controller';
import { GroupsActionsController } from './controllers/groups-actions.controller';
import { ClassStaffAccessController } from './controllers/class-staff-access.controller';
import { GroupsStudentsAccessController } from './controllers/groups-students-access.controller';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { SharedModule } from '@/shared/shared.module';
import { LevelsModule } from '@/modules/levels/levels.module';
import { SubjectsModule } from '@/modules/subjects/subjects.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { UserProfileModule } from '@/modules/user-profile/user-profile.module';
import { SessionsModule } from '@/modules/sessions/sessions.module';
import { ClassStatusUpdateJob } from './jobs/class-status-update.job';
import { Center } from '@/modules/centers/entities/center.entity';
import { ClassStateMachine } from './state-machines/class-state-machine';
import { TeacherPayoutModule } from '@/modules/teacher-payouts/teacher-payouts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Class,
      Group,
      ScheduleItem,
      GroupStudent,
      StudentPaymentStrategy,
      TeacherPaymentStrategy,
      ClassStaff,
      Center,
    ]),
    forwardRef(() => AccessControlModule),
    forwardRef(() => SessionsModule),
    SharedModule,
    LevelsModule,
    SubjectsModule,
    CentersModule,
    UserProfileModule,
    forwardRef(() => TeacherPayoutModule),
  ],
  controllers: [
    ClassesController,
    ClassesActionsController,
    GroupsController,
    GroupsActionsController,
    ClassStaffAccessController,
    GroupsStudentsAccessController,
  ],
  providers: [
    ClassesService,
    GroupsService,
    GroupScheduleService,
    GroupStudentService,
    ScheduleService,
    ClassValidationService,
    GroupValidationService,
    PaymentStrategyService,
    ClassStaffService,
    ClassAccessService,
    ClassesRepository,
    GroupsRepository,
    ScheduleItemsRepository,
    GroupStudentsRepository,
    StudentPaymentStrategyRepository,
    TeacherPaymentStrategyRepository,
    ClassStaffRepository,
    ClassStateMachine,
    ClassStatusUpdateJob,
  ],
  exports: [
    ClassesService,
    GroupsService,
    ScheduleService,
    ClassValidationService,
    GroupValidationService,
    PaymentStrategyService,
    ClassAccessService,
    ClassStaffService,
    ClassesRepository,
    GroupsRepository,
    ScheduleItemsRepository,
    GroupStudentsRepository,
    StudentPaymentStrategyRepository,
    TeacherPaymentStrategyRepository,
    ClassStaffRepository,
  ],
})
export class ClassesModule {}
