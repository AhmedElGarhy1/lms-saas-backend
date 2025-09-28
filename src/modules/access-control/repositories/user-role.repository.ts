import { Injectable } from '@nestjs/common';
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
          isActive: true,
        },
        centerId
          ? {
              userId,
              centerId,
              isActive: true,
            }
          : {},
      ],
      relations: ['role'],
    });
  }

  async findUserRolesByUserId(userId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { userId, isActive: true },
      relations: ['role'],
    });
  }

  async findUserRolesForCenter(
    userId: string,
    centerId: string,
  ): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { userId, centerId, isActive: true },
      relations: ['role'],
    });
  }

  async findUserRolesByRoleId(roleId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { roleId, isActive: true },
      relations: ['role', 'user'],
    });
  }

  async assignUserRole(data: {
    userId: string;
    roleId: string;
    centerId?: string;
  }): Promise<UserRole> {
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
    }
    return (await queryBuilder.getCount()) > 0;
  }
}
