import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UserRole } from '../entities/roles/user-role.entity';
import { LoggerService } from '@/shared/services/logger.service';
import { ScopeEnum } from '@/common/constants/role-scope.enum';

@Injectable()
export class UserRoleRepository extends BaseRepository<UserRole> {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    protected readonly logger: LoggerService,
  ) {
    super(userRoleRepository, logger);
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

  async findUserRolesByScope(
    userId: string,
    scope: ScopeEnum,
  ): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { userId, isActive: true },
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
}
