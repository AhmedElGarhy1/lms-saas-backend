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
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

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
    private readonly i18n: I18nService<I18nTranslations>,
  ) {
    super();
  }

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
    const center = await this.findCenterById(centerId);
    if (!center) {
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.resourceNotFound'),
      );
    }

    if (dto.name && dto.name !== center.name) {
      const existingCenter = await this.centersRepository.findByName(dto.name);
      if (existingCenter) {
        throw new BusinessLogicException(
          this.i18n.translate('errors.centerAlreadyExists', {
            args: { name: dto.name },
          }),
        );
      }
    }

    const updatedCenter = await this.centersRepository.updateCenter(
      centerId,
      dto,
    );
    if (!updatedCenter) {
      throw new ResourceNotFoundException(
        this.i18n.translate('errors.resourceNotFound'),
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
    await this.findCenterById(centerId);

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
