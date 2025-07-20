import { Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { AccessControlController } from './access-control.controller';
import { PermissionsGuard } from './guards/permissions.guard';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [AccessControlService, PermissionsGuard],
  controllers: [AccessControlController],
  exports: [AccessControlService, PermissionsGuard],
})
export class AccessControlModule {}
