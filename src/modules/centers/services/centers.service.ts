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
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { LoggerService } from '@/shared/services/logger.service';
import { UserService } from '@/modules/user/services/user.service';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { CreateUserRequestDto } from '@/modules/user/dto/create-user.dto';

export interface ListCentersParams {
  query: PaginationQuery;
  userId: string;
  targetUserId: string;
}

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

  /**
   * Private helper method to find center by ID with proper error handling
   */
  private async findCenterById(centerId: string): Promise<Center> {
    const center = await this.centersRepository.findOne(centerId);
    if (!center) {
      throw new NotFoundException(`Center with ID '${centerId}' not found`);
    }
    return center;
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
      centerAccess: [
        {
          centerId: savedCenter.id,
          roleIds: [centerAdminRole.id], // Use the newly created center admin role
        },
      ],
    };

    // Create the user
    const createdUser = await this.userService.createUser(userDto);

    // Handle center access and role assignment for the created user
    await this.userService.handleUserCenterAccess(
      createdUser.id,
      userDto,
      userId,
    );

    // Give the creator access to the center they created
    await this.accessControlService.grantCenterAccess(
      userId,
      savedCenter.id,
      userId, // Creator grants access to themselves
    );

    // Assign CENTER_ADMIN role to the creator for the center they created
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

  async listCenters(
    query: PaginationQuery,
    userId: string,
  ): Promise<Pagination<Center>> {
    this.logger.info(`Listing centers for user: ${userId}`);
    const targetUserId = query.filter?.targetUserId as string;
    const _userId: string = query.filter?.userId as string;
    delete query.filter?.targetUserId;
    delete query.filter?.userId;

    if (_userId) {
      await this.accessControlHelperService.validateUserAccess({
        granterUserId: userId,
        targetUserId: _userId,
      });
    }

    console.log('userId', userId);
    console.log('_userId', _userId);
    console.log('_userId ?? userId', _userId ?? userId);

    return await this.centersRepository.paginateCenters({
      query,
      userId: _userId ?? userId,
      targetUserId,
    });
  }

  async getCenterById(centerId: string): Promise<Center> {
    return this.findCenterById(centerId);
  }

  async updateCenter(
    centerId: string,
    dto: UpdateCenterRequestDto,
    userId: string,
  ): Promise<Center> {
    this.logger.info(`Updating center: ${centerId} by user: ${userId}`);

    const center = await this.findCenterById(centerId);

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
    if (center.userCenters?.length ?? 0 > 0) {
      throw new BadRequestException('Cannot delete center with active users');
    }

    await this.centersRepository.softDelete(centerId);
  }

  async restoreCenter(centerId: string, userId: string): Promise<Center> {
    this.logger.info(`Restoring center: ${centerId} by user: ${userId}`);

    const center = await this.findCenterById(centerId);

    if (center.isActive) {
      throw new BadRequestException('Center is already active');
    }
    // Permission check should be in controller

    await this.centersRepository.restore(centerId);
    return this.findCenterById(centerId);
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
