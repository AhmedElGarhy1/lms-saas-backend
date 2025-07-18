import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ChangeMemberRoleDto } from './dto/change-member-role.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class CentersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // Center management
  async createCenter(dto: CreateCenterDto & { ownerId: string }) {
    const center = await this.prisma.center.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: dto.ownerId,
      },
    });
    this.logger.log(`Created center ${center.id} by user ${dto.ownerId}`);
    return center;
  }

  async updateCenter(centerId: string, dto: UpdateCenterDto) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });
    if (!center || center.deletedAt)
      throw new NotFoundException('Center not found');
    const updated = await this.prisma.center.update({
      where: { id: centerId },
      data: { ...dto },
    });
    this.logger.log(`Updated center ${centerId}`);
    return updated;
  }

  async softDeleteCenter(centerId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });
    if (!center || center.deletedAt)
      throw new NotFoundException('Center not found');
    const deleted = await this.prisma.center.update({
      where: { id: centerId },
      data: { deletedAt: new Date() },
    });
    this.logger.warn(`Soft deleted center ${centerId}`);
    return deleted;
  }

  async getCenterById(centerId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });
    if (!center || center.deletedAt)
      throw new NotFoundException('Center not found');
    this.logger.log(`Fetched center ${centerId}`);
    return center;
  }

  async listCentersForUser(userId: string) {
    const centers = await this.prisma.userOnCenter.findMany({
      where: { userId },
      include: { center: true },
    });
    this.logger.log(`Listed centers for user ${userId}`);
    return centers.map((uoc) => uoc.center).filter((c) => !c.deletedAt);
  }

  // Member management
  async addMember(centerId: string, dto: AddMemberDto & { createdBy: string }) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });
    if (!center || center.deletedAt)
      throw new NotFoundException('Center not found');
    const exists = await this.prisma.userOnCenter.findFirst({
      where: { centerId, userId: dto.userId },
    });
    if (exists) throw new BadRequestException('User already a member');
    const role = await this.prisma.role.findFirst({
      where: { name: dto.role, scope: 'CENTER', centerId },
    });
    if (!role) throw new NotFoundException('Role not found for this center');
    const member = await this.prisma.userOnCenter.create({
      data: {
        centerId,
        userId: dto.userId,
        roleId: role.id,
        createdBy: dto.createdBy,
      },
    });
    this.logger.log(
      `Added user ${dto.userId} to center ${centerId} as ${dto.role} by ${dto.createdBy}`,
    );
    return member;
  }

  async removeMember(centerId: string, userId: string) {
    const member = await this.prisma.userOnCenter.findFirst({
      where: { centerId, userId },
    });
    if (!member) throw new NotFoundException('Member not found');
    await this.prisma.userOnCenter.delete({ where: { id: member.id } });
    this.logger.warn(`Removed user ${userId} from center ${centerId}`);
    return { success: true };
  }

  async changeMemberRole(
    centerId: string,
    userId: string,
    dto: ChangeMemberRoleDto,
  ) {
    const member = await this.prisma.userOnCenter.findFirst({
      where: { centerId, userId },
    });
    if (!member) throw new NotFoundException('Member not found');
    const role = await this.prisma.role.findFirst({
      where: { name: dto.role, scope: 'CENTER', centerId },
    });
    if (!role) throw new NotFoundException('Role not found for this center');
    const updated = await this.prisma.userOnCenter.update({
      where: { id: member.id },
      data: { roleId: role.id },
    });
    this.logger.log(
      `Changed role for user ${userId} in center ${centerId} to ${dto.role}`,
    );
    return updated;
  }

  async listMembers(centerId: string) {
    const members = await this.prisma.userOnCenter.findMany({
      where: { centerId },
      include: { user: true, role: true },
    });
    this.logger.log(`Listed members for center ${centerId}`);
    return members;
  }

  async filterMembersByRole(centerId: string, role: string) {
    const roleObj = await this.prisma.role.findFirst({
      where: { name: role, scope: 'CENTER', centerId },
    });
    if (!roleObj) throw new NotFoundException('Role not found for this center');
    const members = await this.prisma.userOnCenter.findMany({
      where: { centerId, roleId: roleObj.id },
      include: { user: true, role: true },
    });
    this.logger.log(`Filtered members by role ${role} in center ${centerId}`);
    return members;
  }
}
