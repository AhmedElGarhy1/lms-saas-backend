import { Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { AccessControlController } from './access-control.controller';
import { PermissionsGuard } from './guards/permissions.guard';
import { ContextGuard } from './guards/context.guard';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [AccessControlService, PermissionsGuard, ContextGuard],
  controllers: [AccessControlController],
  exports: [AccessControlService, PermissionsGuard, ContextGuard],
})
export class AccessControlModule {}
