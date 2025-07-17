import {
  Injectable,
  Inject,
  LoggerService,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AssignCenterDto } from './dto/assign-center.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { centers: true },
    });
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }
    this.logger.log(`Fetched profile for user ${userId}`);
    const { password: _, ...rest } = user;
    void _;
    return rest;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
    });
    this.logger.log(`Updated profile for user ${userId}`);
    const { password: __, ...restUpdated } = updated;
    void __;
    return restUpdated;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }
    const valid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!valid) {
      this.logger.warn(`Invalid old password for user ${userId}`);
      throw new ForbiddenException('Invalid old password');
    }
    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
    this.logger.log(`Changed password for user ${userId}`);
    return { message: 'Password changed successfully' };
  }

  async assignToCenter(userId: string, dto: AssignCenterDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }
    // Find if UserOnCenter exists
    const userOnCenter = await this.prisma.userOnCenter.findFirst({
      where: { userId, centerId: dto.centerId },
    });
    if (userOnCenter) {
      await this.prisma.userOnCenter.update({
        where: { id: userOnCenter.id },
        data: { roleId: dto.roleId },
      });
    } else {
      await this.prisma.userOnCenter.create({
        data: { userId, centerId: dto.centerId, roleId: dto.roleId },
      });
    }
    this.logger.log(
      `Assigned user ${userId} to center ${dto.centerId} with role ${dto.roleId}`,
    );
    return { message: 'User assigned to center' };
  }

  async inviteUser(dto: InviteUserDto) {
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (user) {
      this.logger.warn(`User already exists: ${dto.email}`);
      throw new BadRequestException('User already exists');
    }
    user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.fullName,
        isActive: false,
        password: '',
      },
    });
    // TODO: Send invite email with token
    this.logger.log(`Invited user by email: ${dto.email}`);
    return { message: 'User invited', userId: user.id };
  }
}
