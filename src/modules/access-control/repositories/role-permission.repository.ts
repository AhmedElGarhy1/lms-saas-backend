import { Injectable } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { RolePermission } from '../entities/role-permission.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { PermissionScope } from '@/modules/access-control/constants/permissions';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class RolePermissionRepository extends BaseRepository<RolePermission> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof RolePermission {
    return RolePermission;
  }
}
