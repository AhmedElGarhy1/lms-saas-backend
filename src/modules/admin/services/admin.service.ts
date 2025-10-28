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
  UpdateUserEvent,
  DeleteUserEvent,
  RestoreUserEvent,
  ActivateUserEvent,
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
    // Create admin entity
    const admin = await this.adminRepository.create({});

    // Emit event to create admin (listener handles everything)
    await this.eventEmitter.emitAsync(
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
    await this.eventEmitter.emitAsync(
      UserEvents.UPDATE,
      new UpdateUserEvent(userId, updateData, actor),
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
    await this.eventEmitter.emitAsync(
      UserEvents.DELETE,
      new DeleteUserEvent(userId, actor),
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
    await this.eventEmitter.emitAsync(
      UserEvents.RESTORE,
      new RestoreUserEvent(userId, actor),
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
    await this.eventEmitter.emitAsync(
      UserEvents.ACTIVATE,
      new ActivateUserEvent(userId, isActive, actor),
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
