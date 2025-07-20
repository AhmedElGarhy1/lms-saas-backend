import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../shared/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcryptImport from 'bcrypt';
const bcrypt = bcryptImport as unknown as {
  hash: (data: string, saltOrRounds: string | number) => Promise<string>;
  compare: (data: string, encrypted: string) => Promise<boolean>;
};
import { User as PrismaUser } from '@prisma/client';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailerService } from '../shared/mail/mailer.service';
import { randomBytes } from 'crypto';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly mailer: MailerService,
  ) {}

  async signup(dto: SignupDto) {
    const { email, password, fullName } = dto;
    const existing: PrismaUser | null = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      this.logger.warn(`Signup failed: Email already exists (${email})`);
      throw new BadRequestException('Email already exists');
    }
    const hash: string = await bcrypt.hash(password, 10);
    let user: PrismaUser;
    await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          password: hash,
          name: fullName,
        },
      });
      user = created;
      // Create email verification token
      const token: string = randomBytes(32).toString('hex');
      const expiresAt: Date = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await tx.emailVerification.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });
      // Send verification email
      await this.mailer.sendMail(
        email,
        'Verify your email',
        `<p>Welcome! Please verify your email by clicking <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}">here</a>.</p>`,
      );
    });
    this.logger.log(`User signed up: ${email}`);
    return {
      message:
        'Signup successful. Please check your email to verify your account.',
    };
  }

  async login(dto: LoginDto & { code?: string }) {
    const { email, password, code } = dto;
    const user: PrismaUser | null = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      this.logger.warn(`Login failed: User not found (${email})`);
      throw new UnauthorizedException('Invalid credentials');
    }
    // Account lockout check
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      this.logger.warn(`Login failed: Account locked (${email})`);
      const now: Date = new Date();
      const diffMs: number = user.lockoutUntil.getTime() - now.getTime();
      const diffMin: number = Math.ceil(diffMs / 60000);
      const unlockTime: string =
        user.lockoutUntil.toISOString().replace('T', ' ').substring(0, 16) +
        ' UTC';
      throw new UnauthorizedException(
        `Account is temporarily locked. Try again in ${diffMin} minute(s) (at ${unlockTime}).`,
      );
    }
    const valid: boolean = await bcrypt.compare(password, user.password);
    if (!valid) {
      // Increment failed attempts and lock if needed
      let failedLoginAttempts: number = (user.failedLoginAttempts ?? 0) + 1;
      let lockoutUntil: Date | null = null;
      if (failedLoginAttempts >= 5) {
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
        failedLoginAttempts = 0; // reset after lockout
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts, lockoutUntil } as Partial<PrismaUser>,
      });
      this.logger.warn(`Login failed: Invalid password (${email})`);
      throw new UnauthorizedException('Invalid credentials');
    }
    // 2FA check (after password is validated)
    if (user.twoFactorEnabled ?? false) {
      if (!code) {
        throw new UnauthorizedException('2FA code required');
      }
      const verified: boolean = speakeasy.totp.verify({
        secret: user.twoFactorSecret ?? '',
        encoding: 'base32',
        token: code,
      });
      if (!verified) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }
    // Reset failed attempts and lockout on success
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      } as Partial<PrismaUser>,
    });
    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    this.logger.log(`User logged in: ${email}`);
    return tokens;
  }

  async refreshToken(dto: RefreshTokenDto) {
    const { refreshToken } = dto;
    const tokenInDb = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!tokenInDb || tokenInDb.expiresAt < new Date()) {
      this.logger.warn('Refresh token invalid or expired');
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user: PrismaUser | null = await this.prisma.user.findUnique({
      where: { id: tokenInDb.userId },
    });
    if (!user) {
      this.logger.warn('Refresh token user not found');
      throw new UnauthorizedException('Invalid refresh token');
    }
    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    this.logger.log(`Refresh token used for user: ${user.email}`);
    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId } });
    });
    this.logger.log(`User logged out: ${userId}`);
    return { message: 'Logged out' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const { token } = dto;
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
    });
    if (!verification || verification.expiresAt < new Date()) {
      this.logger.warn('Email verification failed: invalid or expired token');
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: verification.userId },
        data: { isActive: true },
      });
      await tx.emailVerification.delete({ where: { token } });
    });
    this.logger.log(`Email verified for user: ${verification.userId}`);
    return { message: 'Email verified successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;
    const user: PrismaUser | null = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      this.logger.warn(`Forgot password: user not found (${email})`);
      // Don't reveal user existence
      return { message: 'If this email exists, a reset link has been sent.' };
    }
    const token: string = randomBytes(32).toString('hex');
    const expiresAt: Date = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });
      await this.mailer.sendMail(
        email,
        'Reset your password',
        `<p>Reset your password by clicking <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}">here</a>.</p>`,
      );
    });
    this.logger.log(`Password reset requested for: ${email}`);
    return { message: 'If this email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { token, newPassword } = dto;
    const reset = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });
    if (!reset || reset.expiresAt < new Date() || reset.used) {
      this.logger.warn('Password reset failed: invalid or expired token');
      throw new BadRequestException('Invalid or expired reset token');
    }
    const hash: string = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: reset.userId },
        data: { password: hash },
      });
      await tx.passwordResetToken.update({
        where: { token },
        data: { used: true },
      });
    });
    this.logger.log(`Password reset for user: ${reset.userId}`);
    return { message: 'Password reset successful' };
  }

  async setup2FA(userId: string) {
    const secret: speakeasy.GeneratedSecret = speakeasy.generateSecret({
      length: 20,
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });
    const otpauth: string | undefined = secret.otpauth_url;
    if (!otpauth) {
      throw new BadRequestException('Failed to generate 2FA secret');
    }
    const qr: string = await qrcode.toDataURL(otpauth);
    return { qr, secret: secret.base32 };
  }

  async enable2FA(userId: string, code: string) {
    const user: PrismaUser | null = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA not set up');
    }
    const verified: boolean = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
    });
    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA code');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    return { message: '2FA enabled' };
  }

  async disable2FA(userId: string, code: string) {
    const user: PrismaUser | null = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA not set up');
    }
    const verified: boolean = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
    });
    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA code');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return { message: '2FA disabled' };
  }

  async verifyPassword(userId: string, password: string) {
    const user: PrismaUser | null = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const valid: boolean = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid password');
    }
    return true;
  }

  private async generateTokens(userId: string, email: string) {
    const payload = {
      sub: userId,
      email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });
    // Store refresh token with expiry
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return { accessToken, refreshToken, expiresAt };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.refreshToken.create({
        data: {
          token: refreshToken,
          userId,
          expiresAt,
        },
      });
    });
  }
}
