import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { PaginateQuery, Paginated } from 'nestjs-paginate';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    protected readonly logger: LoggerService,
  ) {
    super(userRepository, logger);
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { email },
        select: [
          'id',
          'email',
          'password',
          'isActive',
          'twoFactorEnabled',
          'twoFactorSecret',
          'failedLoginAttempts',
          'lockoutUntil',
        ],
      });
    } catch (error) {
      this.logger.error(`Error finding user by email ${email}:`, error);
      throw error;
    }
  }

  async findUserWithAuthRelations(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { email },
        select: [
          'id',
          'email',
          'password',
          'name',
          'isActive',
          'twoFactorEnabled',
          'twoFactorSecret',
          'failedLoginAttempts',
          'lockoutUntil',
        ],
      });
    } catch (error) {
      this.logger.error(
        `Error finding user with auth relations ${email}:`,
        error,
      );
      throw error;
    }
  }

  // Consolidated method to find user with flexible relations
  async findUserWithRelations(
    userId: string,
    relations: string[] = [],
  ): Promise<User | null> {
    try {
      const queryBuilder = this.userRepository.createQueryBuilder('user');

      // Add relations dynamically
      relations.forEach((relation) => {
        queryBuilder.leftJoinAndSelect(`user.${relation}`, relation);
      });

      return await queryBuilder.where('user.id = :userId', { userId }).getOne();
    } catch (error) {
      this.logger.error(`Error finding user with relations ${userId}:`, error);
      throw error;
    }
  }

  // Convenience methods using the consolidated method
  async findUserForProfile(userId: string): Promise<User | null> {
    return this.findUserWithRelations(userId, [
      'profile',
      'centers',
      'centers.center',
      'userRoles',
      'userRoles.role',
    ]);
  }

  async findUserBasic(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'name', 'email', 'isActive', 'createdAt'],
      });
    } catch (error) {
      this.logger.error(`Error finding basic user ${userId}:`, error);
      throw error;
    }
  }

  async findUserWithProfile(userId: string): Promise<User | null> {
    return this.findUserWithRelations(userId, ['profile']);
  }

  async findUserWithPermissions(userId: string): Promise<User | null> {
    return this.findUserWithRelations(userId, ['userRoles', 'userRoles.role']);
  }

  async findUserWithCenters(userId: string): Promise<User | null> {
    return this.findUserWithRelations(userId, [
      'centers',
      'centers.center',
      'centers.role',
    ]);
  }

  // Updated pagination method using BaseRepository paginate
  async paginateUsers(
    query: PaginateQuery,
    options?: {
      includeCenters?: boolean;
      includePermissions?: boolean;
      includeUserAccess?: boolean;
      includeAccess?: boolean;
      where?: Record<string, any>;
    },
  ): Promise<Paginated<User>> {
    const relations: string[] = ['profile'];

    if (options?.includeCenters) {
      relations.push('centers', 'centers.center');
    }

    if (options?.includeUserAccess) {
      relations.push('userAccess');
    }

    if (options?.includeAccess) {
      relations.push('grantedAccess');
    }

    const paginateOptions = {
      searchableColumns: ['name', 'email'],
      sortableColumns: ['name', 'email', 'isActive', 'createdAt', 'updatedAt'],
      filterableColumns: ['isActive'],
      defaultSortBy: ['createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
      relations,
      defaultLimit: 10,
      maxLimit: 100,
    };

    // Use BaseRepository paginate method
    return this.paginate(query, paginateOptions);
  }

  async updateUserTwoFactor(
    userId: string,
    twoFactorSecret: string | null,
    twoFactorEnabled: boolean,
  ): Promise<void> {
    try {
      await this.userRepository.update(userId, {
        twoFactorSecret: twoFactorSecret || undefined,
        twoFactorEnabled,
      });
    } catch (error) {
      this.logger.error(
        `Error updating user two-factor settings ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async updateFailedLoginAttempts(
    userId: string,
    failedAttempts: number,
    lockoutUntil?: Date,
  ): Promise<void> {
    try {
      const updateData: any = { failedLoginAttempts: failedAttempts };
      if (lockoutUntil) {
        updateData.lockoutUntil = lockoutUntil;
      }

      await this.userRepository.update(userId, updateData);
    } catch (error) {
      this.logger.error(
        `Error updating failed login attempts ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    try {
      await this.userRepository.update(userId, {
        failedLoginAttempts: 0,
        lockoutUntil: undefined,
      });
    } catch (error) {
      this.logger.error(
        `Error resetting failed login attempts ${userId}:`,
        error,
      );
      throw error;
    }
  }

  // Methods for user activation service
  async findActiveUsersInCenter(centerId: string): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: {
          centers: {
            centerId,
            isActive: true,
          },
        },
        relations: ['profile', 'centers', 'centers.center'],
      });
    } catch (error) {
      this.logger.error(
        `Error finding active users in center ${centerId}:`,
        error,
      );
      throw error;
    }
  }

  async findActiveUsers(): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: { isActive: true },
        relations: ['profile'],
      });
    } catch (error) {
      this.logger.error('Error finding active users:', error);
      throw error;
    }
  }

  async findInactiveUsersInCenter(centerId: string): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: {
          centers: {
            centerId,
            isActive: false,
          },
        },
        relations: ['profile', 'centers', 'centers.center'],
      });
    } catch (error) {
      this.logger.error(
        `Error finding inactive users in center ${centerId}:`,
        error,
      );
      throw error;
    }
  }

  async findInactiveUsers(): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: { isActive: false },
        relations: ['profile'],
      });
    } catch (error) {
      this.logger.error('Error finding inactive users:', error);
      throw error;
    }
  }
}
