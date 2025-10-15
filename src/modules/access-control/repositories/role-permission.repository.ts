import { Injectable } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RolePermission } from '../entities/role-permission.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { PermissionScope } from '@/modules/access-control/constants/permissions';

@Injectable()
export class RolePermissionRepository extends BaseRepository<RolePermission> {
  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    protected readonly logger: LoggerService,
  ) {
    super(rolePermissionRepository, logger);
  }
}
