import { Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { AccessControlController } from './access-control.controller';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [AccessControlService, RolesGuard, PermissionsGuard],
  controllers: [AccessControlController],
  exports: [AccessControlService, RolesGuard, PermissionsGuard],
})
export class AccessControlModule {}
