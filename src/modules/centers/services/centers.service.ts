import { Injectable, Inject, forwardRef } from '@nestjs/common';
import {
  ResourceNotFoundException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';
import { CentersRepository } from '../repositories/centers.repository';
import { Center } from '../entities/center.entity';
import { CreateCenterDto } from '../dto/create-center.dto';
import { UpdateCenterRequestDto } from '../dto/update-center.dto';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { LoggerService } from '@/shared/services/logger.service';
import { UserService } from '@/modules/user/services/user.service';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { PaginateCentersDto } from '../dto/paginate-centers.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { createOwnerRoleData } from '@/modules/access-control/constants/roles';
import { Transactional } from 'typeorm-transactional';

export interface SeederCenterData {
  name: string;
  description?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
}

@Injectable()
export class CentersService {
  constructor(
    private readonly centersRepository: CentersRepository,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly accessControlService: AccessControlService,
    private readonly logger: LoggerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly rolesService: RolesService,
  ) {}

  async findCenterById(centerId: string): Promise<Center | null> {
    return this.centersRepository.findOne(centerId);
  }

  @Transactional()
  async createCenter(dto: CreateCenterDto, actor: ActorUser): Promise<Center> {
    // Create the center first
    const center = await this.centersRepository.create({
      name: dto.name,
      description: dto.description,
      phone: dto.phone,
      email: dto.email,
      website: dto.website,
      isActive: dto.isActive,
    });

    const user = await this.userService.createUser(dto.user, actor);
    const centerRoleData = createOwnerRoleData(center.id);
    // TODO: Add permissions to the role
    const centerRole = await this.rolesService.createRole(
      {
        ...centerRoleData,
        rolePermissions: [],
      },
      actor,
    );

    await this.rolesService.assignRole({
      userProfileId: actor.userProfileId,
      roleId: centerRole.id,
      centerId: center.id,
    });

    return center;
  }

  async paginateCenters(query: PaginateCentersDto, actor: ActorUser) {
    return await this.centersRepository.paginateCenters(query, actor);
  }

  async updateCenter(
    centerId: string,
    dto: UpdateCenterRequestDto,
    userProfileId: string,
  ): Promise<Center> {
    this.logger.info(`Updating center: ${centerId} by user profile: ${userProfileId}`);

    const center = await this.findCenterById(centerId);
    if (!center) {
      throw new ResourceNotFoundException(
        `Center with ID '${centerId}' not found`,
      );
    }

    if (dto.name && dto.name !== center.name) {
      const existingCenter = await this.centersRepository.findByName(dto.name);
      if (existingCenter) {
        throw new BusinessLogicException(
          `Center with name '${dto.name}' already exists`,
        );
      }
    }

    const updatedCenter = await this.centersRepository.updateCenter(
      centerId,
      dto,
    );
    if (!updatedCenter) {
      throw new ResourceNotFoundException(
        `Center with ID '${centerId}' not found`,
      );
    }

    return updatedCenter;
  }

  async deleteCenter(centerId: string, userProfileId: string): Promise<void> {
    this.logger.info(`Deleting center: ${centerId} by user profile: ${userProfileId}`);

    const center = await this.findCenterById(centerId);
    // Permission check should be in controller

    await this.centersRepository.softRemove(centerId);
  }

  async restoreCenter(centerId: string, userProfileId: string): Promise<Center> {
    this.logger.info(`Restoring center: ${centerId} by user profile: ${userProfileId}`);

    const center = await this.findCenterById(centerId);
    if (!center) {
      throw new ResourceNotFoundException(
        `Center with ID '${centerId}' not found`,
      );
    }

    await this.centersRepository.restore(centerId);
    const restoredCenter = await this.findCenterById(centerId);
    return restoredCenter!;
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

  async createCenterForSeeder(centerData: SeederCenterData): Promise<Center> {
    this.logger.info(`Creating center '${centerData.name}' for seeding`);

    // Create the center without user validation for seeding
    const savedCenter = await this.centersRepository.create(centerData);

    this.logger.info(`Center created for seeding: ${savedCenter.id}`);
    return savedCenter;
  }
}
