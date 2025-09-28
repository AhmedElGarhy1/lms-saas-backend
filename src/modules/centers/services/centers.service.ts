import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CentersRepository } from '../repositories/centers.repository';
import { Center } from '../entities/center.entity';
import { CreateCenterRequestDto } from '../dto/create-center.dto';
import { UpdateCenterRequestDto } from '../dto/update-center.dto';
import { CenterUserAssignmentDto } from '../dto/center-response.dto';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { LoggerService } from '@/shared/services/logger.service';

@Injectable()
export class CentersService {
  constructor(
    private readonly centersRepository: CentersRepository,
    private readonly accessControlService: AccessControlService,
    private readonly accessControlHelperService: AccessControlHelperService,
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
    });

    this.logger.info(`Center created: ${savedCenter.id}`);

    return savedCenter;
  }

  async listCenters(
    query: PaginationQuery,
    userId: string,
  ): Promise<Pagination<Center>> {
    this.logger.info(`Listing centers for user: ${userId}`);

    return await this.centersRepository.paginateCenters(query, userId);
  }

  async getCenterById(centerId: string): Promise<Center> {
    const center = await this.centersRepository.findOne(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID ${centerId} not found`);
    }
    return center;
  }

  async updateCenter(
    centerId: string,
    dto: UpdateCenterRequestDto,
    userId: string,
  ): Promise<Center> {
    this.logger.info(`Updating center: ${centerId} by user: ${userId}`);

    const center = await this.centersRepository.findOne(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }

    if (dto.name && dto.name !== center.name) {
      const existingCenter = await this.centersRepository.findByName(dto.name);
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

    const center = await this.centersRepository.findOne(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }
    // Permission check should be in controller

    const centerWithUsers = await this.centersRepository.findOne(centerId);
    // TODO: later
    if (centerWithUsers?.userCenters?.length ?? 0 > 0) {
      throw new BadRequestException('Cannot delete center with active users');
    }

    await this.centersRepository.softDelete(centerId);
  }

  async restoreCenter(centerId: string, userId: string): Promise<Center> {
    this.logger.info(`Restoring center: ${centerId} by user: ${userId}`);

    const center = await this.centersRepository.findOne(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }

    if (center.isActive) {
      throw new BadRequestException('Center is already active');
    }
    // Permission check should be in controller

    await this.centersRepository.restore(centerId);
    const restoredCenter = await this.centersRepository.findOne(centerId);
    if (!restoredCenter) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }

    return restoredCenter;
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
