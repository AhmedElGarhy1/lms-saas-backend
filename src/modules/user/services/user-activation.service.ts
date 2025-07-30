import { Injectable, NotFoundException } from '@nestjs/common';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../entities/user.entity';
import { LoggerService } from '@/shared/services/logger.service';

export interface ActivationRequest {
  isActive: boolean;
  centerId?: string;
}

export interface ActivationStatus {
  global: { isActive: boolean };
  centers: Array<{
    centerId: string;
    centerName: string;
    isActive: boolean;
  }>;
}

@Injectable()
export class UserActivationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accessControlService: AccessControlService,
    private readonly logger: LoggerService,
  ) {}

  async activateUser(
    userId: string,
    dto: ActivationRequest,
    currentUserId: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update global activation status
    await this.userRepository.update(userId, { isActive: dto.isActive });

    // Update center-specific activation if centerId is provided
    if (dto.centerId) {
      // Update center-specific user activation status
      await this.accessControlService.updateUserCenterActivation(
        userId,
        dto.centerId,
        dto.isActive,
      );
    }

    this.logger.log(
      `User activation status updated: ${userId} to ${dto.isActive} by ${currentUserId}`,
      'UserActivationService',
      {
        userId,
        isActive: dto.isActive,
        centerId: dto.centerId,
        updatedBy: currentUserId,
      },
    );
  }

  async getUserActivationStatus(userId: string): Promise<ActivationStatus> {
    const user = await this.userRepository.findUserWithCenters(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      global: { isActive: user.isActive },
      centers: user.centers.map((center) => ({
        centerId: center.centerId,
        centerName: center.center?.name || 'Unknown Center',
        isActive: center.isActive,
      })),
    };
  }

  async deactivateUser(userId: string, currentUserId: string): Promise<void> {
    await this.activateUser(userId, { isActive: false }, currentUserId);
  }

  async reactivateUser(userId: string, currentUserId: string): Promise<void> {
    await this.activateUser(userId, { isActive: true }, currentUserId);
  }

  async activateUserInCenter(
    userId: string,
    centerId: string,
    currentUserId: string,
  ): Promise<void> {
    await this.activateUser(
      userId,
      { isActive: true, centerId },
      currentUserId,
    );
  }

  async deactivateUserInCenter(
    userId: string,
    centerId: string,
    currentUserId: string,
  ): Promise<void> {
    await this.activateUser(
      userId,
      { isActive: false, centerId },
      currentUserId,
    );
  }

  async getActiveUsers(centerId?: string): Promise<User[]> {
    if (centerId) {
      // Get active users for specific center
      return this.userRepository.findActiveUsersInCenter(centerId);
    } else {
      // Get globally active users
      return this.userRepository.findActiveUsers();
    }
  }

  async getInactiveUsers(centerId?: string): Promise<User[]> {
    if (centerId) {
      // Get inactive users for specific center
      return this.userRepository.findInactiveUsersInCenter(centerId);
    } else {
      // Get globally inactive users
      return this.userRepository.findInactiveUsers();
    }
  }

  async bulkActivateUsers(
    userIds: string[],
    isActive: boolean,
    centerId: string | undefined,
    currentUserId: string,
  ): Promise<void> {
    for (const userId of userIds) {
      await this.activateUser(userId, { isActive, centerId }, currentUserId);
    }

    this.logger.log(
      `Bulk ${isActive ? 'activated' : 'deactivated'} ${userIds.length} users`,
      'UserActivationService',
      {
        userIds,
        isActive,
        centerId,
        updatedBy: currentUserId,
      },
    );
  }
}
