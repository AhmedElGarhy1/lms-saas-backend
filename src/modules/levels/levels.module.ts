import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Level } from './entities/level.entity';
import { LevelsService } from './services/levels.service';
import { LevelsRepository } from './repositories/levels.repository';
import { LevelsController } from './controllers/levels.controller';
import { LevelsActionsController } from './controllers/levels-actions.controller';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { SharedModule } from '@/shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Level]),
    AccessControlModule,
    SharedModule,
  ],
  controllers: [LevelsController, LevelsActionsController],
  providers: [LevelsService, LevelsRepository],
  exports: [LevelsService, LevelsRepository],
})
export class LevelsModule {}
