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
import { CreateAdminEvent } from '@/modules/admin/events/admin.events';
import { AdminEvents } from '@/shared/events/admin.events.enum';
// Note: User event emissions are now handled by command handlers
// No need to import old event classes or emit events here

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
    userProfileId: string,
    updateData: UpdateAdminDto,
    actor: ActorUser,
  ): Promise<User> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: userProfileId,
    });

    // Note: updateUserByProfileId now emits UserCommands.UPDATE internally
    // Command handler will emit UserEvents.UPDATED, which triggers activity logging
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
      throw new Error('Access denied');
    }

    // Note: deleteUserByProfileId should emit UserCommands.DELETE internally
    // For now, calling deleteUser directly which emits the command
    const userProfile = await this.userService.findUserByProfileId(userProfileId, actor);
    if (!userProfile) {
      throw new Error('User profile not found');
    }
    await this.userService.deleteUser(userProfile.id, actor);
    // Command handler will emit UserEvents.DELETED, which triggers activity logging
  }

  async restoreAdmin(userProfileId: string, actor: ActorUser): Promise<void> {
    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new Error('Access denied');
    }

    // Note: restoreUserByProfileId should emit UserCommands.RESTORE internally
    // For now, calling restoreUser directly which emits the command
    const userProfile = await this.userService.findUserByProfileId(userProfileId, actor);
    if (!userProfile) {
      throw new Error('User profile not found');
    }
    await this.userService.restoreUser(userProfile.id, actor);
    // Command handler will emit UserEvents.RESTORED, which triggers activity logging
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

    // Note: activateProfileUser emits UserCommands.ACTIVATE internally
    // Command handler will emit UserEvents.ACTIVATED, which triggers activity logging
    await this.userService.activateProfileUser(userProfileId, isActive, actor);
  }

  async findOne(userProfileId: string, actor: ActorUser): Promise<User> {
    const user = await this.userService.findUserByProfileId(
      userProfileId,
      actor,
    );
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
