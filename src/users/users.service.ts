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
import { InviteUserDto } from './dto/invite-user.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MailerService } from '../shared/mail/mailer.service';

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
    // Generate invitation token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await this.prisma.inviteToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });
    // Send invitation email
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;
    await this.mailer.sendMail(
      dto.email,
      'You are invited to join LMS SaaS',
      `<p>Hello ${dto.fullName},</p><p>You have been invited to join LMS SaaS. Please accept your invitation by clicking <a href="${inviteUrl}">here</a>. This link will expire in 24 hours.</p>`,
    );
    this.logger.log(`Invited user by email: ${dto.email}`);
    return { message: 'User invited', userId: user.id };
  }

  async acceptInvite(token: string, password: string, fullName?: string) {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!invite) {
      throw new BadRequestException('Invalid or expired invite token');
    }
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite token has expired');
    }
    if (invite.user.isActive) {
      throw new BadRequestException('User is already active');
    }
    const hash = await bcrypt.hash(password, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: invite.userId },
        data: {
          password: hash,
          isActive: true,
          name: fullName ?? invite.user.name,
        },
      });
      await tx.inviteToken.delete({ where: { token } });
    });
    this.logger.log(`Invite accepted for user: ${invite.user.email}`);
    return { message: 'Invite accepted. You can now log in.' };
  }
}
