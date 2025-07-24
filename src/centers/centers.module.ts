import { Module } from '@nestjs/common';
import { CentersService } from './centers.service';
import { CentersController } from './centers.controller';
import { CenterAccessService } from './center-access.service';
import { CenterAccessController } from './center-access.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [CentersService, CenterAccessService],
  controllers: [CentersController, CenterAccessController],
  exports: [CentersService, CenterAccessService],
})
export class CentersModule {}
