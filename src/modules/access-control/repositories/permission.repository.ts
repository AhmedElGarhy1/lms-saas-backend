import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Permission } from '../entities/permission.entity';
import { LoggerService } from '../../../shared/services/logger.service';

@Injectable()
export class PermissionRepository extends BaseRepository<Permission> {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    protected readonly logger: LoggerService,
  ) {
    super(permissionRepository, logger);
  }

  async createPermission(data: {
    action: string;
    description?: string;
    isAdmin?: boolean;
  }): Promise<Permission> {
    const permission = this.permissionRepository.create({
      action: data.action,
      description: data.description || data.action,
      isAdmin: data.isAdmin || false,
    });
    return this.permissionRepository.save(permission);
  }

  async findPermissionByAction(action: string): Promise<Permission | null> {
    return this.permissionRepository.findOne({ where: { action } });
  }

  async getAdminPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({ where: { isAdmin: true } });
  }
}
