import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './entities/subject.entity';
import { SubjectsService } from './services/subjects.service';
import { SubjectsRepository } from './repositories/subjects.repository';
import { SubjectsController } from './controllers/subjects.controller';
import { SubjectsActionsController } from './controllers/subjects-actions.controller';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { SharedModule } from '@/shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subject]),
    AccessControlModule,
    SharedModule,
  ],
  controllers: [SubjectsController, SubjectsActionsController],
  providers: [SubjectsService, SubjectsRepository],
  exports: [SubjectsService, SubjectsRepository],
})
export class SubjectsModule {}

