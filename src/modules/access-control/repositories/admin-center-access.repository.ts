import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminCenterAccess } from '../entities/admin/admin-center-access.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '../../../shared/services/logger.service';

@Injectable()
export class AdminCenterAccessRepository extends BaseRepository<AdminCenterAccess> {
  constructor(
    @InjectRepository(AdminCenterAccess)
    private readonly adminCenterAccessRepository: Repository<AdminCenterAccess>,
    protected readonly logger: LoggerService,
  ) {
    super(adminCenterAccessRepository, logger);
  }

  async grantAdminCenterAccess(body: {
    adminId: string;
    centerId: string;
    grantedBy: string;
  }): Promise<void> {
    await this.adminCenterAccessRepository.save({
      adminUserId: body.adminId,
      centerId: body.centerId,
      granterUserId: body.grantedBy,
    });
  }

  async revokeAdminCenterAccess(body: {
    adminId: string;
    centerId: string;
  }): Promise<void> {
    await this.adminCenterAccessRepository.delete({
      adminUserId: body.adminId,
      centerId: body.centerId,
    });
  }

  async getAdminCenterAccess(adminId: string): Promise<AdminCenterAccess[]> {
    return this.adminCenterAccessRepository.find({
      where: { adminUserId: adminId },
      relations: ['center'],
    });
  }

  async findAdminCenterAccess(
    adminId: string,
    centerId: string,
  ): Promise<AdminCenterAccess | null> {
    return this.adminCenterAccessRepository.findOne({
      where: { adminUserId: adminId, centerId },
    });
  }

  async findCenterAdmins(centerId: string): Promise<AdminCenterAccess[]> {
    return this.adminCenterAccessRepository.find({
      where: { centerId },
    });
  }
}
