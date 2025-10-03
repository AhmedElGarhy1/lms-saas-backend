import { BadRequestException, Injectable } from '@nestjs/common';
import { IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { UserRole } from '../entities/roles/user-role.entity';
import { LoggerService } from '@/shared/services/logger.service';

@Injectable()
export class UserRoleRepository extends BaseRepository<UserRole> {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    protected readonly logger: LoggerService,
  ) {
    super(userRoleRepository, logger);
  }

  async getUserRoles(userId: string, centerId?: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: [
        {
          userId,
          centerId: IsNull(),
        },
        centerId
          ? {
              userId,
              centerId,
            }
          : {},
      ],
      relations: ['role'],
    });
  }

  async getUserRole(
    userId: string,
    centerId?: string,
  ): Promise<UserRole | null> {
    return this.userRoleRepository.findOne({
      where: {
        userId,
        centerId: centerId || IsNull(),
      },
      relations: ['role'],
    });
  }

  async findUserRoles(userId: string, centerId?: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { userId, centerId: centerId || IsNull() },
      relations: ['role'],
    });
  }

  async findUserRolesByRoleId(roleId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { roleId },
      relations: ['role', 'user'],
    });
  }

  async assignUserRole(data: {
    userId: string;
    roleId: string;
    centerId?: string;
  }): Promise<UserRole> {
    const existingUserRole = await this.getUserRole(data.userId, data.centerId);
    if (existingUserRole) {
      throw new BadRequestException('User already has a role in this scope');
    }

    const userRole = this.userRoleRepository.create({
      userId: data.userId,
      roleId: data.roleId,
      centerId: data.centerId,
    });

    return this.userRoleRepository.save(userRole);
  }

  async removeUserRole(data: {
    userId: string;
    roleId: string;
    centerId?: string;
  }): Promise<void> {
    const existingUserRole = await this.getUserRole(data.userId, data.centerId);
    if (!existingUserRole) {
      throw new BadRequestException('User does not have a role in this scope');
    }
    await this.userRoleRepository.delete({
      userId: data.userId,
      roleId: data.roleId,
      centerId: data.centerId,
    });
  }

  async userHasRoleType(
    userId: string,
    roleType: string,
    centerId?: string,
  ): Promise<boolean> {
    const queryBuilder = this.userRoleRepository.createQueryBuilder('userRole');
    queryBuilder.leftJoinAndSelect('userRole.role', 'role');
    queryBuilder.where('userRole.userId = :userId', { userId });
    queryBuilder.andWhere('role.type = :roleType', { roleType });
    if (centerId) {
      queryBuilder.andWhere('userRole.centerId = :centerId', { centerId });
    } else {
      queryBuilder.andWhere('userRole.centerId IS NULL');
    }
    return (await queryBuilder.getCount()) > 0;
  }
}
