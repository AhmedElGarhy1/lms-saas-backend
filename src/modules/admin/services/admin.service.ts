import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdminRepository } from '../repositories/admin.repository';
import { UserService } from '@/modules/user/services/user.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { PaginateAdminDto } from '../dto/paginate-admin.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { User } from '@/modules/user/entities/user.entity';
import { Admin } from '../entities/admin.entity';
import {
  CreateAdminEvent,
  AdminEvents,
} from '@/modules/admin/events/admin.events';
import {
  UserUpdatedEvent,
  UserDeletedEvent,
  UserRestoredEvent,
  UserActivatedEvent,
  UserEvents,
} from '@/modules/user/events/user.events';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly userService: UserService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createAdmin(dto: CreateAdminDto, actor: ActorUser): Promise<void> {
    // Emit event to create admin (listener handles everything)
    this.eventEmitter.emit(
      AdminEvents.CREATE,
      new CreateAdminEvent(dto, actor),
    );

    // The listener will handle user creation
  }

  async paginateAdmins(params: PaginateAdminDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;
    return this.userService.paginateAdmins(params, actor);
  }

  async updateAdmin(
    userId: string,
    updateData: UpdateAdminDto,
    actor: ActorUser,
  ): Promise<User> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: actor.userProfileId,
    });

    const user = await this.userService.updateUser(userId, updateData, actor);

    // Emit event for activity logging
    this.eventEmitter.emit(
      UserEvents.UPDATED,
      new UserUpdatedEvent(userId, updateData, actor),
    );

    return user;
  }

  async deleteAdmin(userId: string, actor: ActorUser): Promise<void> {
    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new Error('Access denied');
    }

    await this.userService.deleteUser(userId, actor);

    // Emit event for activity logging
    this.eventEmitter.emit(
      UserEvents.DELETED,
      new UserDeletedEvent(userId, actor),
    );
  }

  async restoreAdmin(userId: string, actor: ActorUser): Promise<void> {
    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new Error('Access denied');
    }

    await this.userService.restoreUser(userId, actor);

    // Emit event for activity logging
    this.eventEmitter.emit(
      UserEvents.RESTORED,
      new UserRestoredEvent(userId, actor),
    );
  }

  async toggleAdminStatus(
    userId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: actor.userProfileId,
    });

    await this.userService.activateUser(userId, isActive, actor);

    // Emit event for activity logging
    this.eventEmitter.emit(
      UserEvents.ACTIVATED,
      new UserActivatedEvent(userId, isActive, actor),
    );
  }

  async findOne(userId: string): Promise<User> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
