import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { CreatePermissionRequestDto } from './dto/create-permission.dto';
import { CreateRoleRequestDto } from './dto/create-role.dto';
import { UpdateRoleRequestDto } from './dto/update-role.dto';
import { RoleScopeEnum } from './constants/role-scope.enum';

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  // Create a global role
  async createGlobalRole(dto: any) {
    if (dto.scope !== RoleScopeEnum.GLOBAL) {
      throw new BadRequestException('Scope must be GLOBAL for this endpoint');
    }
    return this.prisma.role.create({
      data: {
        name: dto.name,
        scope: RoleScopeEnum.GLOBAL,
        isAdmin: dto.isAdmin ?? false,
        metadata: dto.metadata,
      },
    });
  }

  // Create an internal (center) role
  async createInternalRole(dto: any) {
    if (dto.scope !== RoleScopeEnum.CENTER || !dto.centerId) {
      throw new BadRequestException(
        'Scope must be CENTER and centerId is required',
      );
    }
    return this.prisma.role.create({
      data: {
        name: dto.name,
        scope: RoleScopeEnum.CENTER,
        centerId: dto.centerId,
        isAdmin: dto.isAdmin ?? false,
        metadata: dto.metadata,
      },
    });
  }

  // Create a permission
  async createPermission(dto: CreatePermissionRequestDto) {
    return this.prisma.permission.create({
      data: {
        action: dto.action,
        name: dto.name,
        isAdmin: dto.isAdmin ?? false,
      },
    });
  }

  // Assign a role to a user (context-aware)
  async assignRole(dto: {
    userId: string;
    roleId: string;
    scopeType: RoleScopeEnum;
    scopeId: string | null;
  }) {
    if (dto.scopeType === RoleScopeEnum.CENTER && !dto.scopeId) {
      throw new BadRequestException(
        'scopeId (centerId) is required for CENTER scope',
      );
    }
    if (dto.scopeType === RoleScopeEnum.GLOBAL && dto.scopeId) {
      throw new BadRequestException(
        'scopeId must be null/empty for GLOBAL scope',
      );
    }
    return this.prisma.userRole.create({
      data: {
        userId: dto.userId,
        roleId: dto.roleId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeType === RoleScopeEnum.CENTER ? dto.scopeId : null,
      },
    });
  }

  // Assign a permission override to a user (context-aware)
  async assignUserPermission(dto: {
    userId: string;
    permissionId: string;
    scopeType: RoleScopeEnum;
    scopeId: string | null;
  }) {
    if (!dto.userId) throw new BadRequestException('userId is required');
    if (!dto.permissionId)
      throw new BadRequestException('permissionId is required');
    if (!dto.scopeType) throw new BadRequestException('scopeType is required');
    if (dto.scopeType === RoleScopeEnum.CENTER && !dto.scopeId) {
      throw new BadRequestException(
        'scopeId (centerId) is required for CENTER scope',
      );
    }
    if (dto.scopeType === RoleScopeEnum.GLOBAL && dto.scopeId) {
      throw new BadRequestException(
        'scopeId must be null/empty for GLOBAL scope',
      );
    }
    return this.prisma.userPermission.create({
      data: {
        userId: dto.userId,
        permissionId: dto.permissionId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeType === RoleScopeEnum.CENTER ? dto.scopeId : null,
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

  // Get user roles filtered by current scope
  async getUserRolesForScope(
    userId: string,
    scope: RoleScopeEnum,
    centerId?: string,
  ) {
    const whereClause: any = { userId };

    if (scope === RoleScopeEnum.CENTER) {
      if (!centerId) {
        throw new BadRequestException('centerId is required for CENTER scope');
      }
      whereClause.OR = [{ scopeType: RoleScopeEnum.CENTER, scopeId: centerId }];
    } else {
      // For GLOBAL scope, show all roles
      whereClause.OR = [
        { scopeType: RoleScopeEnum.GLOBAL },
        { scopeType: RoleScopeEnum.CENTER },
      ];
    }

    return this.prisma.userRole.findMany({
      where: whereClause,
      include: { role: true },
    });
  }

  // Get user permissions (resolved + overrides)
  async getUserPermissions(userId: string, centerId?: string) {
    // 1. Get all direct user permission overrides
    const userPermsWhere: any = { userId };
    if (centerId) {
      userPermsWhere.OR = [
        { scopeType: RoleScopeEnum.GLOBAL },
        { scopeType: RoleScopeEnum.CENTER, scopeId: centerId },
      ];
    }

    const userPerms = await this.prisma.userPermission.findMany({
      where: userPermsWhere,
      include: { permission: true },
    });

    // 2. Get all roles for user
    const userRolesWhere: any = { userId };
    if (centerId) {
      userRolesWhere.OR = [
        { scopeType: RoleScopeEnum.GLOBAL },
        { scopeType: RoleScopeEnum.CENTER, scopeId: centerId },
      ];
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: userRolesWhere,
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

  // Get global roles (excluding Teacher and Student roles)
  async getGlobalRoles() {
    return this.prisma.role.findMany({
      where: {
        scope: RoleScopeEnum.GLOBAL,
        name: {
          notIn: ['Teacher', 'Student'],
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Get internal (center) roles by centerId (excluding Teacher and Student roles)
  async getInternalRoles(centerId: string) {
    return this.prisma.role.findMany({
      where: {
        scope: RoleScopeEnum.CENTER,
        centerId: centerId,
        name: {
          notIn: ['Teacher', 'Student'],
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Create a new role
  async createRole(dto: CreateRoleRequestDto) {
    // Validate centerId for CENTER scope
    if (dto.scope === 'CENTER' && !dto.centerId) {
      throw new BadRequestException('centerId is required for CENTER scope');
    }

    // Check if role name already exists for this scope
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: dto.name,
        scope: dto.scope,
        centerId: dto.scope === 'CENTER' ? dto.centerId : null,
      },
    });

    if (existingRole) {
      throw new BadRequestException(
        `Role with name "${dto.name}" already exists for this scope`,
      );
    }

    // Create the role
    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        isAdmin: dto.isAdmin || false,
        scope: dto.scope,
        centerId: dto.scope === 'CENTER' ? dto.centerId : null,
        permissions: dto.permissions || [],
        metadata: dto.metadata || {},
      },
    });

    return role;
  }

  // Update an existing role
  async updateRole(roleId: string, dto: UpdateRoleRequestDto) {
    // Check if role exists
    const existingRole = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }

    // Check if new name conflicts with existing role (if name is being updated)
    if (dto.name && dto.name !== existingRole.name) {
      const conflictingRole = await this.prisma.role.findFirst({
        where: {
          name: dto.name,
          scope: existingRole.scope,
          centerId: existingRole.centerId,
          id: { not: roleId },
        },
      });

      if (conflictingRole) {
        throw new BadRequestException(
          `Role with name "${dto.name}" already exists for this scope`,
        );
      }
    }

    // Update the role
    const updatedRole = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.isAdmin !== undefined && { isAdmin: dto.isAdmin }),
        ...(dto.permissions && { permissions: dto.permissions }),
        ...(dto.metadata && { metadata: dto.metadata }),
      },
    });

    return updatedRole;
  }

  // Delete a role
  async deleteRole(roleId: string) {
    // Check if role exists
    const existingRole = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }

    // Check if role is assigned to any users in UserRole table
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId },
    });

    if (userRoles.length > 0) {
      throw new BadRequestException(
        'Cannot delete role that is assigned to users. Remove role assignments first.',
      );
    }

    // Check if role is assigned to any users in UserOnCenter table
    const userOnCenterRoles = await this.prisma.userOnCenter.findMany({
      where: { roleId },
    });

    if (userOnCenterRoles.length > 0) {
      throw new BadRequestException(
        'Cannot delete role that is assigned to users in centers. Remove center role assignments first.',
      );
    }

    // Delete the role
    await this.prisma.role.delete({
      where: { id: roleId },
    });

    return { message: 'Role deleted successfully' };
  }

  // Get a specific role by ID
  async getRoleById(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  // Get all roles (global + internal for a specific center, excluding Teacher and Student roles)
  async getAllRoles(centerId?: string) {
    const whereClause: any = {
      name: {
        notIn: ['Teacher', 'Student'],
      },
    };

    if (centerId) {
      whereClause.OR = [
        { scope: RoleScopeEnum.GLOBAL },
        { scope: RoleScopeEnum.CENTER, centerId: centerId },
      ];
    } else {
      whereClause.scope = RoleScopeEnum.GLOBAL;
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
        { scope: RoleScopeEnum.GLOBAL },
        { scope: RoleScopeEnum.CENTER, centerId: centerId },
      ];
    } else {
      whereClause.scope = RoleScopeEnum.GLOBAL;
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
      include: { target: true },
    });
  }
}
