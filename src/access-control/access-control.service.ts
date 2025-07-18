import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { CreateRoleDto, RoleScope } from './dto/create-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { Role, RolePermission, Permission } from '@prisma/client';

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  // Create a global role
  async createGlobalRole(dto: CreateRoleDto) {
    if (dto.scope !== RoleScope.GLOBAL) {
      throw new BadRequestException('Scope must be GLOBAL for this endpoint');
    }
    return this.prisma.role.create({
      data: {
        name: dto.name,
        scope: RoleScope.GLOBAL,
        isPublic: dto.isPublic ?? false,
        metadata: dto.metadata,
      },
    });
  }

  // Create an internal (center) role
  async createInternalRole(dto: CreateRoleDto) {
    if (dto.scope !== RoleScope.CENTER || !dto.centerId) {
      throw new BadRequestException(
        'Scope must be CENTER and centerId is required',
      );
    }
    return this.prisma.role.create({
      data: {
        name: dto.name,
        scope: RoleScope.CENTER,
        centerId: dto.centerId,
        isPublic: dto.isPublic ?? false,
        metadata: dto.metadata,
      },
    });
  }

  // Create a permission
  async createPermission(dto: CreatePermissionDto) {
    return this.prisma.permission.create({
      data: { action: dto.action },
    });
  }

  // Assign a role to a user (context-aware)
  async assignRole(dto: AssignRoleDto) {
    if (dto.scopeType === RoleScope.CENTER && !dto.scopeId) {
      throw new BadRequestException(
        'scopeId (centerId) is required for CENTER scope',
      );
    }
    if (dto.scopeType === RoleScope.GLOBAL && dto.scopeId) {
      throw new BadRequestException(
        'scopeId must be null/empty for GLOBAL scope',
      );
    }
    return this.prisma.userRole.create({
      data: {
        userId: dto.userId,
        roleId: dto.roleId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeType === RoleScope.CENTER ? dto.scopeId : null,
      },
    });
  }

  // Assign a permission override to a user (context-aware)
  async assignUserPermission(dto: AssignPermissionDto) {
    if (!dto.userId) throw new BadRequestException('userId is required');
    if (!dto.permissionId)
      throw new BadRequestException('permissionId is required');
    if (!dto.scopeType) throw new BadRequestException('scopeType is required');
    if (dto.scopeType === RoleScope.CENTER && !dto.scopeId) {
      throw new BadRequestException(
        'scopeId (centerId) is required for CENTER scope',
      );
    }
    if (dto.scopeType === RoleScope.GLOBAL && dto.scopeId) {
      throw new BadRequestException(
        'scopeId must be null/empty for GLOBAL scope',
      );
    }
    return this.prisma.userPermission.create({
      data: {
        userId: dto.userId,
        permissionId: dto.permissionId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeType === RoleScope.CENTER ? dto.scopeId : null,
      },
    });
  }

  // Assign a permission to a role
  async assignPermissionToRole(dto: AssignPermissionDto) {
    if (!dto.roleId) throw new BadRequestException('roleId is required');
    if (!dto.permissionId)
      throw new BadRequestException('permissionId is required');
    return this.prisma.rolePermission.create({
      data: {
        roleId: dto.roleId,
        permissionId: dto.permissionId,
      },
    });
  }

  // Get user roles (with scopes)
  async getUserRoles(userId: string) {
    return this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
  }

  // Get user permissions (resolved + overrides)
  async getUserPermissions(userId: string) {
    // 1. Get all direct user permission overrides
    const userPerms = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
    // 2. Get all roles for user
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });
    // 3. Collect all permissions from roles
    const rolePerms = userRoles.flatMap((ur) =>
      (
        ur.role.rolePermissions as (RolePermission & {
          permission: Permission;
        })[]
      ).map((rp) => rp.permission.action),
    );
    // 4. Collect all direct user permission overrides
    const userPermActions = userPerms.map((up) => up.permission.action);
    // 5. Combine and dedupe
    return Array.from(new Set([...userPermActions, ...rolePerms]));
  }
}
