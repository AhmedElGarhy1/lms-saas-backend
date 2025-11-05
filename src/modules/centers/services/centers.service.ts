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
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { CenterEvents } from '@/shared/events/center.events.enum';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
  DeleteCenterEvent,
  RestoreCenterEvent,
} from '../events/center.events';

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
    private readonly accessControlService: AccessControlService,
    private readonly logger: LoggerService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly rolesService: RolesService,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  async findCenterById(centerId: string): Promise<Center> {
    const center = await this.centersRepository.findOne(centerId);
    if (!center) {
      throw new ResourceNotFoundException('Center not found');
    }
    return center;
  }

  async createCenter(dto: CreateCenterDto, actor: ActorUser): Promise<Center> {
    // Create the center
    const center = await this.centersRepository.create({
      name: dto.name,
      description: dto.description,
      phone: dto.phone,
      email: dto.email,
      website: dto.website,
      isActive: dto.isActive,
    });

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      CenterEvents.CREATED,
      new CreateCenterEvent(center, actor),
    );

    return center;
  }

  async paginateCenters(query: PaginateCentersDto, actor: ActorUser) {
    return await this.centersRepository.paginateCenters(query, actor);
  }

  async updateCenter(
    centerId: string,
    dto: UpdateCenterRequestDto,
    actor: ActorUser,
  ): Promise<Center> {
    this.logger.info(
      `Updating center: ${centerId} by user profile: ${actor.userProfileId}`,
    );

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

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      CenterEvents.UPDATED,
      new UpdateCenterEvent(centerId, dto, actor),
    );

    return updatedCenter;
  }

  async deleteCenter(centerId: string, actor: ActorUser): Promise<void> {
    this.logger.info(
      `Deleting center: ${centerId} by user profile: ${actor.userProfileId}`,
    );

    await this.findCenterById(centerId);
    // Permission check should be in controller

    await this.centersRepository.softRemove(centerId);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      CenterEvents.DELETED,
      new DeleteCenterEvent(centerId, actor),
    );
  }

  async restoreCenter(centerId: string, actor: ActorUser): Promise<Center> {
    this.logger.info(
      `Restoring center: ${centerId} by user profile: ${actor.userProfileId}`,
    );

    const center = await this.findCenterById(centerId);
    if (!center) {
      throw new ResourceNotFoundException(
        `Center with ID '${centerId}' not found`,
      );
    }

    await this.centersRepository.restore(centerId);
    const restoredCenter = await this.findCenterById(centerId);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      CenterEvents.RESTORED,
      new RestoreCenterEvent(centerId, actor),
    );

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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error updating center activation for center ${centerId}:`,
        errorMessage,
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

  async toggleCenterStatus(
    centerId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    await this.findCenterById(centerId);

    await this.centersRepository.update(centerId, { isActive });

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      CenterEvents.UPDATED,
      new UpdateCenterEvent(
        centerId,
        { isActive } as UpdateCenterRequestDto,
        actor,
      ),
    );
  }
}
