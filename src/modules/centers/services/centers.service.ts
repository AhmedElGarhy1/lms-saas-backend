import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CentersRepository } from '../repositories/centers.repository';
import { Center, CenterStatus } from '../entities/center.entity';
import { CreateCenterRequestDto } from '../dto/create-center.dto';
import { UpdateCenterRequestDto } from '../dto/update-center.dto';
import {
  CenterUserAssignmentDto,
  CenterAdminAssignmentDto,
} from '../dto/center-response.dto';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { ScopeEnum } from '@/common/constants/role-scope.enum';
import { CenterEventEmitter } from '../../../common/events/center.events';
import { LoggerService } from '@/shared/services/logger.service';

@Injectable()
export class CentersService {
  constructor(
    private readonly centersRepository: CentersRepository,
    private readonly accessControlService: AccessControlService,
    private readonly rolesService: RolesService,
    private readonly centerEventEmitter: CenterEventEmitter,
    private readonly logger: LoggerService,
  ) {}

  async createCenter(
    dto: CreateCenterRequestDto,
    userId: string,
  ): Promise<Center> {
    this.logger.info(`Creating center '${dto.name}' by user: ${userId}`);

    // Create the center (permission check should be in controller)
    const center = this.centersRepository.create({
      ...dto,
      createdBy: userId,
      currentEnrollment: 0,
    });

    const createdCenter = await center;

    // Emit center created event with admin information
    this.centerEventEmitter.emitCenterCreated({
      centerId: createdCenter.id,
      centerName: createdCenter.name,
      createdBy: userId,
      adminInfo: dto.adminInfo,
    });

    this.logger.info(
      `Center '${createdCenter.name}' created successfully with ID: ${createdCenter.id}`,
    );

    return createdCenter;
  }

  async listCenters(
    query: PaginateQuery,
    userId: string,
  ): Promise<Paginated<Center>> {
    this.logger.info(`Listing centers for user: ${userId}`);

    // Get centers that the current user has admin access to (for management)
    const adminCenterIds =
      await this.accessControlService.getAdminCenterIds(userId);

    // If user has no admin access to any centers, return empty result
    if (adminCenterIds.length === 0) {
      return {
        data: [],
        meta: {
          itemsPerPage: 0,
          totalItems: 0,
          currentPage: 1,
          totalPages: 0,
          sortBy: [],
          searchBy: [],
          search: '',
          select: [],
          filter: {},
        },
        links: {
          first: '',
          previous: '',
          current: '',
          next: '',
          last: '',
        },
      };
    }

    // Apply center access filter to the query
    const filter: { [column: string]: string | string[] } = { ...query.filter };
    if (adminCenterIds.length > 0) {
      filter.id = adminCenterIds.join(',');
    }

    const filteredQuery = {
      ...query,
      filter,
    };

    // Use the repository's pagination method
    const result = await this.centersRepository.paginateCenters(filteredQuery);

    this.logger.info(
      `Retrieved ${result.data.length} centers for user: ${userId}`,
    );
    return result;
  }

  async getCenterById(centerId: string, userId: string): Promise<Center> {
    const center = await this.centersRepository.findCenterById(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }
    // Permission check should be in controller
    return center;
  }

  async updateCenter(
    centerId: string,
    dto: UpdateCenterRequestDto,
    userId: string,
  ): Promise<Center> {
    this.logger.info(`Updating center: ${centerId} by user: ${userId}`);

    const center = await this.centersRepository.findCenterById(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }
    // Permission check should be in controller

    if (dto.name && dto.name !== center.name) {
      const existingCenter = await this.centersRepository.findCenterByName(
        dto.name,
      );
      if (existingCenter) {
        throw new BadRequestException(
          `Center with name '${dto.name}' already exists`,
        );
      }
    }

    const updatedCenter = await this.centersRepository.updateCenter(
      centerId,
      dto,
    );
    if (!updatedCenter) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }

    return updatedCenter;
  }

  async deleteCenter(centerId: string, userId: string): Promise<void> {
    this.logger.info(`Deleting center: ${centerId} by user: ${userId}`);

    const center = await this.centersRepository.findCenterById(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }
    // Permission check should be in controller

    const centerWithUsers =
      await this.centersRepository.findCentersWithUsers(centerId);
    if (centerWithUsers?.userCenters?.length ?? 0 > 0) {
      throw new BadRequestException('Cannot delete center with active users');
    }

    await this.centersRepository.softDelete(centerId);
  }

  async restoreCenter(centerId: string, userId: string): Promise<Center> {
    this.logger.info(`Restoring center: ${centerId} by user: ${userId}`);

    const center = await this.centersRepository.findCenterById(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }

    if (center.status === CenterStatus.ACTIVE) {
      throw new BadRequestException('Center is already active');
    }
    // Permission check should be in controller

    await this.centersRepository.restore(centerId);
    const restoredCenter =
      await this.centersRepository.findCenterById(centerId);
    if (!restoredCenter) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }

    return restoredCenter;
  }

  async assignUserToCenter(
    dto: CenterUserAssignmentDto,
    assignedBy: string,
  ): Promise<void> {
    this.logger.info(
      `Assigning user ${dto.userId} to center ${dto.centerId} by user: ${assignedBy}`,
    );

    const center = await this.centersRepository.findCenterById(dto.centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${dto.centerId}' not found`);
    }
    // Permission check should be in controller

    const existingAssignment =
      await this.accessControlService.checkCenterAccess(
        dto.userId,
        dto.centerId,
      );
    if (existingAssignment) {
      throw new BadRequestException(
        `User '${dto.userId}' is already assigned to center '${dto.centerId}'`,
      );
    }

    // Create user-center assignment
    await this.accessControlService.addUserToCenter({
      userId: dto.userId,
      centerId: dto.centerId,
    });

    // Assign role if specified
    if (dto.roleId) {
      await this.rolesService.assignRole({
        userId: dto.userId,
        roleId: dto.roleId,
        scopeType: ScopeEnum.CENTER,
        centerId: dto.centerId,
      });
    }

    // Increment enrollment
    await this.centersRepository.incrementEnrollment(dto.centerId);
  }

  async removeUserFromCenter(
    userId: string,
    centerId: string,
    removedBy: string,
  ): Promise<void> {
    this.logger.info(
      `Removing user ${userId} from center ${centerId} by user: ${removedBy}`,
    );

    const center = await this.centersRepository.findCenterById(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }
    // Permission check should be in controller

    const existingAssignment =
      await this.accessControlService.checkCenterAccess(userId, centerId);
    if (!existingAssignment) {
      throw new BadRequestException(
        `User '${userId}' is not assigned to center '${centerId}'`,
      );
    }

    // Remove user-center assignment
    await this.accessControlService.removeUserFromCenter({
      userId,
      centerId,
    });

    // Decrement enrollment
    await this.centersRepository.decrementEnrollment(centerId);
  }

  async getCenterUsers(centerId: string, userId: string): Promise<any[]> {
    // Permission check should be in controller
    // TODO: Implement proper user retrieval with pagination
    return [];
  }

  async assignAdminToCenter(dto: CenterAdminAssignmentDto): Promise<void> {
    this.logger.info(
      `Assigning admin ${dto.adminId} to center ${dto.centerId} by user: ${dto.grantedBy}`,
    );

    const center = await this.centersRepository.findCenterById(dto.centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${dto.centerId}' not found`);
    }
    // Permission check should be in controller

    const existingAssignment =
      await this.accessControlService.getAdminCenterAccess(dto.adminId);
    if (existingAssignment) {
      throw new BadRequestException(
        `Admin '${dto.adminId}' is already assigned to center '${dto.centerId}'`,
      );
    }

    await this.accessControlService.grantAdminCenterAccess({
      adminId: dto.adminId,
      centerId: dto.centerId,
      grantedBy: dto.grantedBy,
    });
  }

  async removeAdminFromCenter(
    adminId: string,
    centerId: string,
    removedBy: string,
  ): Promise<void> {
    this.logger.info(
      `Removing admin ${adminId} from center ${centerId} by user: ${removedBy}`,
    );

    const center = await this.centersRepository.findCenterById(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }
    // Permission check should be in controller

    const existingAssignment =
      await this.accessControlService.getAdminCenterAccess(adminId);
    if (!existingAssignment) {
      throw new BadRequestException(
        `Admin '${adminId}' is not assigned to center '${centerId}'`,
      );
    }

    await this.accessControlService.revokeAdminCenterAccess({
      adminId: adminId,
      centerId: centerId,
    });
  }

  async getCenterAdmins(centerId: string, userId: string): Promise<any[]> {
    // This method would return center admins
    // Implementation depends on your specific requirements
    return [];
  }

  async updateCenterActivation(
    centerId: string,
    isActive: boolean,
    updatedBy: string,
  ): Promise<void> {
    try {
      await this.centersRepository.updateCenterActivation(centerId, isActive);

      this.logger.info(
        `Center ${centerId} activation updated to ${isActive} by ${updatedBy}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating center activation for center ${centerId}:`,
        error,
      );
      throw error;
    }
  }
}
