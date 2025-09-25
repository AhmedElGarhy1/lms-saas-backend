import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CentersRepository } from '../repositories/centers.repository';
import { Center, CenterStatus } from '../entities/center.entity';
import { CreateCenterRequestDto } from '../dto/create-center.dto';
import { UpdateCenterRequestDto } from '../dto/update-center.dto';
import { CenterUserAssignmentDto } from '../dto/center-response.dto';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { CenterEventEmitter } from '@/shared/common/events/center.events';
import { LoggerService } from '@/shared/services/logger.service';

@Injectable()
export class CentersService {
  constructor(
    private readonly centersRepository: CentersRepository,
    private readonly accessControlService: AccessControlService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly centerEventEmitter: CenterEventEmitter,
    private readonly logger: LoggerService,
  ) {}

  async createCenter(
    dto: CreateCenterRequestDto,
    userId: string,
  ): Promise<Center> {
    this.logger.info(`Creating center '${dto.name}' by user: ${userId}`);

    // Create the center
    const savedCenter = await this.centersRepository.create({
      ...dto,
      createdBy: userId,
      currentEnrollment: 0,
    });

    this.logger.info(`Center created: ${savedCenter.id}`);

    return savedCenter;
  }

  async listCenters(
    query: PaginationQuery,
    userId: string,
  ): Promise<Pagination<Center>> {
    this.logger.info(`Listing centers for user: ${userId}`);

    return await this.centersRepository.paginateCenters(query);

    // Get centers that
    // //  the current user has admin access to
    // const adminCenterIds =
    //   await this.accessControlService.getAdminCenterIds(userId);
    // this.logger.info(`Admin center IDs: ${adminCenterIds.join(', ')}`);

    // // Get centers that the current user has user access to
    // const userCenters = await this.accessControlService.getUserCenters(userId);
    // this.logger.info(`User centers: ${JSON.stringify(userCenters)}`);
    // const userCenterIds = userCenters.map((center) => center.centerId);
    // this.logger.info(`User center IDs: ${userCenterIds.join(', ')}`);

    // // Combine both admin and user center IDs
    // const allCenterIds = [...new Set([...adminCenterIds, ...userCenterIds])];
    // this.logger.info(`All center IDs: ${allCenterIds.join(', ')}`);

    // // If user has no access to any centers, return empty result
    // if (allCenterIds.length === 0) {
    //   this.logger.info(`No centers found for user: ${userId}`);
    //   return {
    //     items: [],
    //     meta: {
    //       itemCount: 0,
    //       itemsPerPage: 0,
    //       totalItems: 0,
    //       currentPage: 1,
    //       totalPages: 0,
    //     },
    //     links: {
    //       first: '',
    //       previous: '',
    //       next: '',
    //       last: '',
    //     },
    //   };
    // }

    // // Apply center access filter to the query
    // const filter: { [column: string]: string | string[] } = { ...query.filter };
    // if (allCenterIds.length > 0) {
    //   filter.id = allCenterIds.join(',');
    // }

    // const filteredQuery = {
    //   ...query,
    //   filter,
    // };

    // this.logger.info(`Filtered query: ${JSON.stringify(filteredQuery)}`);

    // // Use the repository's pagination method
    // const result = await this.centersRepository.paginateCenters(filteredQuery);

    // this.logger.info(
    //   `Retrieved ${result.items.length} centers for user: ${userId}`,
    // );

    // return result;
  }

  async getCenterById(centerId: string): Promise<Center> {
    const center = await this.centersRepository.findCenterById(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID ${centerId} not found`);
    }
    return center;
  }

  async findCenterByName(centerName: string): Promise<Center | null> {
    return this.centersRepository.findCenterByName(centerName);
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

    // Check if user is already assigned to this center
    const existingAssignment =
      await this.accessControlHelperService.getUserCenters(dto.userId);

    if (
      existingAssignment &&
      existingAssignment.some((c) => c.id === dto.centerId)
    ) {
      throw new BadRequestException(
        `User '${dto.userId}' is already assigned to center '${dto.centerId}'`,
      );
    }

    // Assign user to center
    await this.accessControlService.addUserToCenter({
      userId: dto.userId,
      centerId: dto.centerId,
    });

    this.logger.info(
      `User ${dto.userId} successfully assigned to center ${dto.centerId}`,
    );
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
      await this.accessControlHelperService.canAccessCenter(userId, centerId);
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

  // Seeder methods
  async clearAllCenters(): Promise<void> {
    this.logger.info('Clearing all centers for seeding...');
    await this.centersRepository.clearAllCenters();
  }

  async createCenterForSeeder(centerData: any): Promise<Center> {
    this.logger.info(`Creating center '${centerData.name}' for seeding`);

    // Create the center without user validation for seeding
    const savedCenter = await this.centersRepository.create({
      ...centerData,
      currentEnrollment: 0,
    });

    this.logger.info(`Center created for seeding: ${savedCenter.id}`);
    return savedCenter;
  }
}
