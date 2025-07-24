import {
  Injectable,
  Inject,
  LoggerService,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../shared/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MailerService } from '../shared/mail/mailer.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { LoginRequestDto } from './dto/login.dto';
import { SignupRequestDto } from './dto/signup.dto';
import { ForgotPasswordRequestDto } from './dto/forgot-password.dto';
import { ResetPasswordRequestDto } from './dto/reset-password.dto';
import { VerifyEmailRequestDto } from './dto/verify-email.dto';
import { TwoFactorRequest } from './dto/2fa.dto';
import { RefreshTokenRequest } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: {
          include: {
            teacher: true,
            student: true,
            guardian: true,
            baseUser: true,
          },
        },
        centers: {
          include: {
            center: true,
            role: true,
          },
        },
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(dto: LoginRequestDto) {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      this.logger.warn(`Failed login attempt for email: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.warn(`Login attempt for inactive user: ${dto.email}`);
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if user is locked out
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      this.logger.warn(`Login attempt for locked user: ${dto.email}`);
      throw new UnauthorizedException('Account is temporarily locked');
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockoutUntil: null,
        },
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate and send 2FA code
      const twoFactorCode = this.generateTwoFactorCode();
      // In a real implementation, you would send this via SMS or email
      this.logger.log(`2FA code for ${dto.email}: ${twoFactorCode}`);

      return {
        requiresTwoFactor: true,
        message: 'Two-factor authentication required',
        tempToken: this.jwtService.sign(
          { sub: user.id, email: user.email, temp: true },
          { expiresIn: '5m' },
        ),
      };
    }

    return this.generateTokens(user);
  }

  async verifyTwoFactor(dto: TwoFactorRequest) {
    try {
      const payload = this.jwtService.verify(dto.tempToken);
      if (!payload.temp || !payload.sub) {
        throw new UnauthorizedException('Invalid temporary token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          profile: {
            include: {
              teacher: true,
              student: true,
              guardian: true,
              baseUser: true,
            },
          },
          centers: {
            include: {
              center: true,
              role: true,
            },
          },
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user || !user.twoFactorEnabled) {
        throw new UnauthorizedException('Invalid user or 2FA not enabled');
      }

      // In a real implementation, you would verify the 2FA code
      // For demo purposes, we'll accept any 6-digit code
      if (!/^\d{6}$/.test(dto.code)) {
        throw new UnauthorizedException('Invalid 2FA code');
      }

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid temporary token');
    }
  }

  async signup(dto: SignupRequestDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user with BASE_USER profile
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.fullName,
        isActive: false, // Require email verification
        profile: {
          create: {
            type: 'BASE_USER',
            baseUser: {
              create: {},
            },
          },
        },
      },
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email (placeholder)
    // await this.mailerService.sendEmailVerification(
    //   user.email,
    //   verificationToken,
    // );

    this.logger.log(`New user registered: ${user.email}`);

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      userId: user.id,
    };
  }

  async verifyEmail(dto: VerifyEmailRequestDto) {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!verification) {
      throw new NotFoundException('Invalid verification token');
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    // Activate user
    await this.prisma.user.update({
      where: { id: verification.userId },
      data: { isActive: true },
    });

    // Delete verification token
    await this.prisma.emailVerification.delete({
      where: { id: verification.id },
    });

    this.logger.log(`Email verified for user: ${verification.user.email}`);

    return {
      message: 'Email verified successfully. You can now log in.',
    };
  }

  async forgotPassword(dto: ForgotPasswordRequestDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    // Create password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send reset email
    await this.mailerService.sendPasswordReset(
      user.email,
      user.name,
      resetToken,
    );

    this.logger.log(`Password reset requested for: ${user.email}`);

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordRequestDto) {
    const reset = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!reset || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: reset.userId },
      data: { password: hashedPassword },
    });

    // Delete reset token
    await this.prisma.passwordResetToken.delete({
      where: { id: reset.id },
    });

    this.logger.log(`Password reset for user: ${reset.user.email}`);

    return {
      message: 'Password reset successfully.',
    };
  }

  async refreshToken(dto: RefreshTokenRequest) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          profile: {
            include: {
              teacher: true,
              student: true,
              guardian: true,
              baseUser: true,
            },
          },
          centers: {
            include: {
              center: true,
              role: true,
            },
          },
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid user');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async enableTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    const secret = crypto.randomBytes(20).toString('hex');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: true,
      },
    });

    this.logger.log(`2FA enabled for user: ${user.email}`);

    return {
      message: 'Two-factor authentication enabled',
      secret,
    };
  }

  async disableTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    this.logger.log(`Disabled 2FA for user ${userId}`);
    return { message: 'Two-factor authentication disabled successfully' };
  }

  async logout(userId: string) {
    // Invalidate refresh tokens for the user
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    this.logger.log(`User ${userId} logged out`);
    return { message: 'Logout successful' };
  }

  async setup2FA(password: string) {
    // This method would typically validate the user's password and generate a QR code
    // For now, we'll return a placeholder response
    const secret = crypto.randomBytes(32).toString('base64');

    return {
      secret,
      qrCode: `otpauth://totp/LMS:user@example.com?secret=${secret}&issuer=LMS`,
      message:
        '2FA setup initiated. Scan the QR code with your authenticator app.',
    };
  }

  async enable2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    // In a real implementation, you would verify the 2FA code here
    // For now, we'll just enable it
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: crypto.randomBytes(32).toString('base64'),
      },
    });

    this.logger.log(`Enabled 2FA for user ${userId}`);
    return { message: 'Two-factor authentication enabled successfully' };
  }

  async disable2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // In a real implementation, you would verify the 2FA code here
    // For now, we'll just disable it
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    this.logger.log(`Disabled 2FA for user ${userId}`);
    return { message: 'Two-factor authentication disabled successfully' };
  }

  async verify2FA(code: string) {
    // This is a placeholder implementation
    // You would typically verify the 2FA code against the user's secret
    return {
      message: '2FA verification completed',
      enabled: true,
    };
  }

  private generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    // Store refresh token
    this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  private generateTwoFactorCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
