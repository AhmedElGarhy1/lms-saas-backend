import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CentersRepository } from '../repositories/centers.repository';
import { Center } from '../entities/center.entity';
import {
  CreateCenterRequestDto,
  CreateCenterUserDto,
} from '../dto/create-center.dto';
import { UpdateCenterRequestDto } from '../dto/update-center.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { LoggerService } from '@/shared/services/logger.service';
import { UserService } from '@/modules/user/services/user.service';
import { CenterResponseDto } from '../dto/center-response.dto';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { CreateUserRequestDto } from '@/modules/user/dto/create-user.dto';
import { PaginateCentersDto } from '../dto/paginate-centers.dto';

export interface SeederCenterData {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
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

  async createCenter(
    dto: CreateCenterRequestDto,
    userId: string,
  ): Promise<Center> {
    this.logger.info(`Creating center '${dto.name}' by user: ${userId}`);

    // Create the center first
    const savedCenter = await this.centersRepository.create({
      name: dto.name,
      description: dto.description,
      address: dto.address,
      phone: dto.phone,
      email: dto.email,
      website: dto.website,
      isActive: dto.isActive,
      createdBy: userId,
    });

    this.logger.info(`Center created: ${savedCenter.id}`);

    // Create a center-specific "Center Admin" role
    const centerAdminRole = await this.rolesService.createRole(
      {
        name: 'Center Admin',
        type: RoleType.CENTER_ADMIN,
        description: `Center Admin role for ${savedCenter.name}`,
        centerId: savedCenter.id,
      },
      userId,
    );

    this.logger.info(
      `Center Admin role created: ${centerAdminRole.id} for center: ${savedCenter.id}`,
    );

    // Create the center admin user
    const user = dto.user as CreateCenterUserDto;
    const userDto: CreateUserRequestDto = {
      name: user.name,
      email: user.email,
      password: user.password,
      isActive: user.isActive ?? true,
      profile: user.profile,
      userRole: {
        centerId: savedCenter.id,
        roleId: centerAdminRole.id, // Use the newly created center admin role
      },
    };

    // Create the user
    const createdUser = await this.userService.createUser(userDto);

    // Handle role assignment for the created user
    await this.userService.handleUserRoleAssignment(
      createdUser.id,
      userDto,
      userId,
    );

    // Assign CENTER_ADMIN role to the creator for the center they created
    // (assigning role with centerId automatically grants center access)
    await this.rolesService.assignRole({
      userId: userId,
      roleId: centerAdminRole.id,
      centerId: savedCenter.id,
    });

    this.logger.info(
      `Center admin user created: ${createdUser.id} for center: ${savedCenter.id}`,
    );
    this.logger.info(
      `Creator ${userId} granted CENTER_ADMIN access to center: ${savedCenter.id}`,
    );

    return savedCenter;
  }

  async listCenters(query: PaginateCentersDto, actorId: string) {
    return await this.centersRepository.paginateCenters(query, actorId);
  }

  async updateCenter(
    centerId: string,
    dto: UpdateCenterRequestDto,
    userId: string,
  ): Promise<Center> {
    this.logger.info(`Updating center: ${centerId} by user: ${userId}`);

    const center = await this.findCenterById(centerId);
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

    const center = await this.findCenterById(centerId);
    // Permission check should be in controller

    // TODO: Check if center has active users before deletion

    await this.centersRepository.softRemove(centerId);
  }

  async restoreCenter(centerId: string, userId: string): Promise<Center> {
    this.logger.info(`Restoring center: ${centerId} by user: ${userId}`);

    const center = await this.findCenterById(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
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
