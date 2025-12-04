import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { Group } from './entities/group.entity';
import { ScheduleItem } from './entities/schedule-item.entity';
import { GroupStudent } from './entities/group-student.entity';
import { StudentPaymentStrategy } from './entities/student-payment-strategy.entity';
import { TeacherPaymentStrategy } from './entities/teacher-payment-strategy.entity';
import { ClassesService } from './services/classes.service';
import { GroupsService } from './services/groups.service';
import { ScheduleService } from './services/schedule.service';
import { ClassValidationService } from './services/class-validation.service';
import { GroupValidationService } from './services/group-validation.service';
import { PaymentStrategyService } from './services/payment-strategy.service';
import { ClassesRepository } from './repositories/classes.repository';
import { GroupsRepository } from './repositories/groups.repository';
import { ScheduleItemsRepository } from './repositories/schedule-items.repository';
import { GroupStudentsRepository } from './repositories/group-students.repository';
import { StudentPaymentStrategyRepository } from './repositories/student-payment-strategy.repository';
import { TeacherPaymentStrategyRepository } from './repositories/teacher-payment-strategy.repository';
import { ClassesController } from './controllers/classes.controller';
import { ClassesActionsController } from './controllers/classes-actions.controller';
import { GroupsController } from './controllers/groups.controller';
import { GroupsActionsController } from './controllers/groups-actions.controller';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { SharedModule } from '@/shared/shared.module';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { LevelsModule } from '@/modules/levels/levels.module';
import { SubjectsModule } from '@/modules/subjects/subjects.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { UserProfileModule } from '@/modules/user-profile/user-profile.module';
import { ClassActivityListener } from './listeners/class-activity.listener';
import { GroupActivityListener } from './listeners/group-activity.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Class,
      Group,
      ScheduleItem,
      GroupStudent,
      StudentPaymentStrategy,
      TeacherPaymentStrategy,
    ]),
    AccessControlModule,
    SharedModule,
    ActivityLogModule,
    LevelsModule,
    SubjectsModule,
    CentersModule,
    UserProfileModule,
  ],
  controllers: [
    ClassesController,
    ClassesActionsController,
    GroupsController,
    GroupsActionsController,
  ],
  providers: [
    ClassesService,
    GroupsService,
    ScheduleService,
    ClassValidationService,
    GroupValidationService,
    PaymentStrategyService,
    ClassesRepository,
    GroupsRepository,
    ScheduleItemsRepository,
    GroupStudentsRepository,
    StudentPaymentStrategyRepository,
    TeacherPaymentStrategyRepository,
    ClassActivityListener,
    GroupActivityListener,
  ],
  exports: [
    ClassesService,
    GroupsService,
    ScheduleService,
    ClassValidationService,
    GroupValidationService,
    PaymentStrategyService,
    ClassesRepository,
    GroupsRepository,
    ScheduleItemsRepository,
    GroupStudentsRepository,
    StudentPaymentStrategyRepository,
    TeacherPaymentStrategyRepository,
  ],
})
export class ClassesModule {}
