import { Injectable, Logger } from '@nestjs/common';
import { AdminRepository } from '../repositories/admin.repository';
import { UserService } from '@/modules/user/services/user.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { PaginateAdminDto } from '../dto/paginate-admin.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { User } from '@/modules/user/entities/user.entity';
import { CreateAdminEvent } from '@/modules/admin/events/admin.events';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { BaseService } from '@/shared/common/services/base.service';
import {
  InsufficientPermissionsException,
  ResourceNotFoundException,
} from '@/shared/common/exceptions/custom.exceptions';

@Injectable()
export class AdminService extends BaseService {
  private readonly logger: Logger;

  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly userService: UserService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {
    super();
    const context = this.constructor.name;
    this.logger = new Logger(context);
  }

  async createAdmin(dto: CreateAdminDto, actor: ActorUser): Promise<void> {
    // Create admin entity
    const admin = await this.adminRepository.create({});

    // Emit event to create admin (listener handles everything)
    await this.typeSafeEventEmitter.emitAsync(
      AdminEvents.CREATE,
      new CreateAdminEvent(dto, actor, admin),
    );
  }

  async paginateAdmins(params: PaginateAdminDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;
    return this.userService.paginateAdmins(params, actor);
  }

  async updateAdmin(
    userProfileId: string,
    updateData: UpdateAdminDto,
    actor: ActorUser,
  ): Promise<User> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: userProfileId,
    });

    return await this.userService.updateUserByProfileId(
      userProfileId,
      updateData,
      actor,
    );
  }

  async deleteAdmin(userProfileId: string, actor: ActorUser): Promise<void> {
    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException('Access denied');
    }

    const userProfile = await this.userService.findUserByProfileId(
      userProfileId,
      actor,
    );
    if (!userProfile) {
      throw new ResourceNotFoundException('User profile not found');
    }
    await this.userService.deleteUser(userProfile.id, actor);
  }

  async restoreAdmin(userProfileId: string, actor: ActorUser): Promise<void> {
    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException('Access denied');
    }

    const userProfile = await this.userService.findUserByProfileId(
      userProfileId,
      actor,
    );
    if (!userProfile) {
      throw new ResourceNotFoundException('User profile not found');
    }
    await this.userService.restoreUser(userProfile.id, actor);
  }

  async toggleAdminStatus(
    userProfileId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: userProfileId,
    });

    await this.userService.activateProfileUser(userProfileId, isActive, actor);
  }

  async findOne(userProfileId: string, actor: ActorUser): Promise<User> {
    const user = await this.userService.findUserByProfileId(
      userProfileId,
      actor,
    );
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }
    return user;
  }
}
