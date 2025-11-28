import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
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
import { BaseService } from '@/shared/common/services/base.service';
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
export class CentersService extends BaseService {
  private readonly logger: Logger = new Logger(CentersService.name);

  constructor(
    private readonly centersRepository: CentersRepository,
    private readonly accessControlService: AccessControlService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly rolesService: RolesService,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {
    super();
  }

  async findCenterById(
    centerId: string,
    actor?: ActorUser,
    isDeleted?: boolean,
    includeInactiveCenter?: boolean,
  ): Promise<Center> {
    const center = isDeleted
      ? await this.centersRepository.findOneSoftDeletedById(centerId)
      : await this.centersRepository.findOne(centerId);
    if (!center) {
      throw new ResourceNotFoundException('t.errors.resourceNotFound');
    }

    // If actor is provided, validate center access
    if (actor) {
      await this.accessControlHelperService.validateCenterAccess(
        {
          userProfileId: actor.userProfileId,
          centerId,
        },
        {
          includeDeletedCenter: isDeleted,
          includeInactiveCenter: includeInactiveCenter ?? true,
        },
      );
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

    await this.typeSafeEventEmitter.emitAsync(
      CenterEvents.CREATED,
      new CreateCenterEvent(center, actor, dto.user, dto.branch),
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
    const center = await this.findCenterById(centerId, actor, false);
    if (!center) {
      throw new ResourceNotFoundException('t.errors.resourceNotFound');
    }

    if (dto.name && dto.name !== center.name) {
      const existingCenter = await this.centersRepository.findByName(dto.name);
      if (existingCenter) {
        throw new BusinessLogicException('t.errors.centerAlreadyExists', {
          name: dto.name,
        });
      }
    }

    const updatedCenter = await this.centersRepository.updateCenter(
      centerId,
      dto,
    );
    if (!updatedCenter) {
      throw new ResourceNotFoundException('t.errors.resourceNotFound');
    }

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      CenterEvents.UPDATED,
      new UpdateCenterEvent(centerId, dto, actor),
    );

    return updatedCenter;
  }

  async deleteCenter(centerId: string, actor: ActorUser): Promise<void> {
    await this.findCenterById(centerId, actor, false);
    // Permission check should be in controller

    await this.centersRepository.softRemove(centerId);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      CenterEvents.DELETED,
      new DeleteCenterEvent(centerId, actor),
    );
  }

  async restoreCenter(centerId: string, actor: ActorUser) {
    const center = await this.findCenterById(centerId, actor, true);

    if (!center.deletedAt) {
      throw new BusinessLogicException('t.errors.centerNotDeleted');
    }

    await this.centersRepository.restore(centerId);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      CenterEvents.RESTORED,
      new RestoreCenterEvent(centerId, actor),
    );
  }

  async updateCenterActivation(
    centerId: string,
    isActive: boolean,
    updatedBy: string,
  ): Promise<void> {
    try {
      await this.centersRepository.updateCenterActivation(centerId, isActive);
    } catch (error: unknown) {
      this.logger.error(
        `Error updating center activation for center ${centerId}`,
        error,
        { centerId, isActive, updatedBy },
      );
      throw error;
    }
  }

  // Seeder methods
  async clearAllCenters(): Promise<void> {
    await this.centersRepository.clearAllCenters();
  }

  async createCenterForSeeder(centerData: SeederCenterData): Promise<Center> {
    // Create the center without user validation for seeding
    const savedCenter = await this.centersRepository.create(centerData);

    return savedCenter;
  }

  async toggleCenterStatus(
    centerId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    await this.findCenterById(centerId, actor, false);

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
