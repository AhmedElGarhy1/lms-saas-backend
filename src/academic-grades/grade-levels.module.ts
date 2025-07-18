import { Module } from '@nestjs/common';
import { GradeLevelsService } from './grade-levels.service';
import { GradeLevelsController } from './grade-levels.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [GradeLevelsService],
  controllers: [GradeLevelsController],
  exports: [GradeLevelsService],
})
export class GradeLevelsModule {}
