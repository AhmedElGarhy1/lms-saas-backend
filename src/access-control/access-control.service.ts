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
import { Role, Permission } from '@prisma/client';

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
        isAdmin: dto.isAdmin ?? false,
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
        isAdmin: dto.isAdmin ?? false,
        metadata: dto.metadata,
      },
    });
  }

  // Create a permission
  async createPermission(dto: CreatePermissionDto) {
    return this.prisma.permission.create({
      data: {
        action: dto.action,
        name: dto.name,
        isAdmin: dto.isAdmin ?? false,
      },
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

  // Bulk update role permissions (replace all permissions)
  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    if (!roleId) throw new BadRequestException('roleId is required');

    // Get the role
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) throw new NotFoundException('Role not found');

    // Get all permissions to validate
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('Some permission IDs are invalid');
    }

    // Extract permission actions
    const permissionActions = permissions.map((p) => p.action);

    // Update role with new permissions
    return this.prisma.role.update({
      where: { id: roleId },
      data: { permissions: permissionActions },
    });
  }

  // Get role permissions
  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) throw new NotFoundException('Role not found');

    return role.permissions || [];
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
        role: true,
      },
    });

    // 3. Collect all permissions from roles (using JSON field)
    const rolePerms = userRoles.flatMap((ur) => {
      const rolePermissions = (ur.role.permissions as string[]) || [];
      return rolePermissions;
    });

    // 4. Collect all direct user permission overrides
    const userPermActions = userPerms.map((up) => up.permission.action);

    // 5. Combine and dedupe
    return Array.from(new Set([...userPermActions, ...rolePerms]));
  }

  // Get all permissions
  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { action: 'asc' },
    });
  }

  // Get global roles
  async getGlobalRoles() {
    return this.prisma.role.findMany({
      where: { scope: RoleScope.GLOBAL },
      orderBy: { name: 'asc' },
    });
  }

  // Get internal (center) roles by centerId
  async getInternalRoles(centerId: string) {
    return this.prisma.role.findMany({
      where: {
        scope: RoleScope.CENTER,
        centerId: centerId,
      },
      orderBy: { name: 'asc' },
    });
  }

  // Get all roles (global + internal for a specific center)
  async getAllRoles(centerId?: string) {
    const whereClause: any = {};

    if (centerId) {
      whereClause.OR = [
        { scope: RoleScope.GLOBAL },
        { scope: RoleScope.CENTER, centerId: centerId },
      ];
    } else {
      whereClause.scope = RoleScope.GLOBAL;
    }

    return this.prisma.role.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });
  }

  // Get admin roles (global + internal for a specific center)
  async getAdminRoles(centerId?: string) {
    const whereClause: any = {
      isAdmin: true,
    };

    if (centerId) {
      whereClause.OR = [
        { scope: RoleScope.GLOBAL },
        { scope: RoleScope.CENTER, centerId: centerId },
      ];
    } else {
      whereClause.scope = RoleScope.GLOBAL;
    }

    return this.prisma.role.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });
  }

  // Get admin permissions
  async getAdminPermissions() {
    return this.prisma.permission.findMany({
      where: { isAdmin: true },
      orderBy: { action: 'asc' },
    });
  }

  // Grant CenterAccess to a user
  async grantCenterAccess(userId: string, centerId: string) {
    return this.prisma.centerAccess.upsert({
      where: { userId_centerId: { userId, centerId } },
      update: {},
      create: { userId, centerId },
    });
  }

  // Revoke CenterAccess from a user
  async revokeCenterAccess(userId: string, centerId: string) {
    return this.prisma.centerAccess.deleteMany({
      where: { userId, centerId },
    });
  }

  // List all centers a user has access to
  async listCenterAccesses(userId: string) {
    return this.prisma.centerAccess.findMany({
      where: { userId },
      include: { center: true },
    });
  }

  // Grant UserAccess to a user (to another user)
  async grantUserAccess(userId: string, targetUserId: string) {
    return this.prisma.userAccess.upsert({
      where: { userId_targetUserId: { userId, targetUserId } },
      update: {},
      create: { userId, targetUserId },
    });
  }

  // Revoke UserAccess from a user (to another user)
  async revokeUserAccess(userId: string, targetUserId: string) {
    return this.prisma.userAccess.deleteMany({
      where: { userId, targetUserId },
    });
  }

  // List all users a user has access to
  async listUserAccesses(userId: string) {
    return this.prisma.userAccess.findMany({
      where: { userId },
      include: { targetUser: true },
    });
  }
}
