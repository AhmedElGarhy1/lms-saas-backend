import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async assignRole(dto: AssignRoleDto) {
    const { userId, roleId, centerId, teacherId } = dto;
    if (!centerId && !teacherId) {
      throw new BadRequestException(
        'Scope (centerId or teacherId) is required',
      );
    }
    if (centerId && teacherId) {
      throw new BadRequestException(
        'Only one scope allowed (centerId or teacherId)',
      );
    }
    const where: any = { userId, roleId };
    if (centerId) where.centerId = centerId;
    if (teacherId) where.teacherId = teacherId;
    const existing = await this.prisma.userOnCenter.findFirst({ where });
    if (existing) {
      throw new BadRequestException(
        'Role already assigned to user in this scope',
      );
    }
    const created = await this.prisma.userOnCenter.create({ data: where });
    return { message: 'Role assigned', id: created.id };
  }

  async removeRole(dto: AssignRoleDto) {
    const { userId, roleId, centerId, teacherId } = dto;
    if (!centerId && !teacherId) {
      throw new BadRequestException(
        'Scope (centerId or teacherId) is required',
      );
    }
    if (centerId && teacherId) {
      throw new BadRequestException(
        'Only one scope allowed (centerId or teacherId)',
      );
    }
    const where: any = { userId, roleId };
    if (centerId) where.centerId = centerId;
    if (teacherId) where.teacherId = teacherId;
    const deleted = await this.prisma.userOnCenter.deleteMany({ where });
    if (deleted.count === 0) {
      throw new BadRequestException('No such role assignment found');
    }
    return { message: 'Role removed' };
  }

  async assignPermission(dto: AssignPermissionDto) {
    const { permissionId, userId, roleId, centerId, teacherId } = dto;
    if (!userId && !roleId) {
      throw new BadRequestException('userId or roleId is required');
    }
    if (userId && roleId) {
      throw new BadRequestException('Only one of userId or roleId allowed');
    }
    if (userId) {
      // User permission override
      const where: any = { userId, permissionId };
      if (centerId) where.centerId = centerId;
      if (teacherId) where.teacherId = teacherId;
      const existing = await this.prisma.userPermission.findFirst({ where });
      if (existing) {
        throw new BadRequestException(
          'Permission already assigned to user in this scope',
        );
      }
      const created = await this.prisma.userPermission.create({ data: where });
      return { message: 'Permission assigned to user', id: created.id };
    } else if (roleId) {
      // Role-permission assignment (many-to-many)
      const role = await this.prisma.role.findUnique({
        where: { id: roleId },
        include: { permissions: true },
      });
      if (!role) throw new BadRequestException('Role not found');
      if (role.permissions.some((p) => p.id === permissionId)) {
        throw new BadRequestException('Permission already assigned to role');
      }
      await this.prisma.role.update({
        where: { id: roleId },
        data: { permissions: { connect: { id: permissionId } } },
      });
      return { message: 'Permission assigned to role' };
    }
  }

  async removePermission(dto: AssignPermissionDto) {
    const { permissionId, userId, roleId, centerId, teacherId } = dto;
    if (!userId && !roleId) {
      throw new BadRequestException('userId or roleId is required');
    }
    if (userId && roleId) {
      throw new BadRequestException('Only one of userId or roleId allowed');
    }
    if (userId) {
      // User permission override
      const where: any = { userId, permissionId };
      if (centerId) where.centerId = centerId;
      if (teacherId) where.teacherId = teacherId;
      const deleted = await this.prisma.userPermission.deleteMany({ where });
      if (deleted.count === 0) {
        throw new BadRequestException(
          'No such user permission assignment found',
        );
      }
      return { message: 'Permission removed from user' };
    } else if (roleId) {
      // Role-permission removal
      const role = await this.prisma.role.findUnique({
        where: { id: roleId },
        include: { permissions: true },
      });
      if (!role) throw new BadRequestException('Role not found');
      if (!role.permissions.some((p) => p.id === permissionId)) {
        throw new BadRequestException('Permission not assigned to role');
      }
      await this.prisma.role.update({
        where: { id: roleId },
        data: { permissions: { disconnect: { id: permissionId } } },
      });
      return { message: 'Permission removed from role' };
    }
  }
}
