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
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MailerService } from '../shared/mail/mailer.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly mailer: MailerService,
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
    // Map fullName to name for the User model
    const updateData: { name?: string } = {};
    if (dto.fullName !== undefined) {
      updateData.name = dto.fullName;
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
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

  async createUser(dto: CreateUserDto) {
    let password = dto.password;
    if (!password) {
      password = Math.random().toString(36).slice(-8) + Date.now();
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.fullName,
        password: hash,
        isActive: true,
      },
      include: {
        centers: true,
        userPermissions: true,
        teacherUsers: true,
      },
    });
    this.logger.log(`Created user ${user.email} (${user.id})`);
    const { password: _, ...rest } = user;
    void _;
    return rest;
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        centers: {
          include: { center: true, role: true },
        },
        userPermissions: true,
        teacherUsers: {
          include: { role: true, teacher: true },
        },
      },
    });
    this.logger.log('Listed all users');
    return users.map(({ password, ...rest }) => rest);
  }
}
