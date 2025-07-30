import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '../../../shared/services/mailer.service';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/services/user.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordResetService } from './password-reset.service';
import { RefreshTokenService } from './refresh-token.service';
import { TwoFactorService } from './two-factor.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginRequestDto } from '../dto/login.dto';
import { SignupRequestDto } from '../dto/signup.dto';
import { ForgotPasswordRequestDto } from '../dto/forgot-password.dto';
import { ResetPasswordRequestDto } from '../dto/reset-password.dto';
import { VerifyEmailRequestDto } from '../dto/verify-email.dto';
import { TwoFactorRequest } from '../dto/2fa.dto';
import { RefreshTokenRequest } from '../dto/refresh-token.dto';
import { LoggerService } from '../../../shared/services/logger.service';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly twoFactorService: TwoFactorService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findUserWithAuthRelations(email);

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
      await this.userService.updateFailedLoginAttempts(user.id, 0);
      await this.userService.updateLockoutUntil(user.id, null);
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate and send 2FA code
      const twoFactorCode = this.twoFactorService.generateToken(
        user.twoFactorSecret,
      );
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

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Create refresh token
    await this.refreshTokenService.createRefreshToken({
      userId: user.id,
      deviceInfo: {
        userAgent: (dto as any).userAgent,
        ipAddress: (dto as any).ipAddress,
      },
    });

    this.logger.log(`User logged in: ${user.email}`, 'AuthService', {
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  async verifyTwoFactor(dto: TwoFactorRequest) {
    const payload = this.jwtService.verify(dto.tempToken);
    const user = await this.userService.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid temporary token');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const isValid = this.twoFactorService.verifyToken(
      dto.code,
      user.twoFactorSecret,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Generate final tokens
    const tokens = this.generateTokens(user);

    // Create refresh token
    await this.refreshTokenService.createRefreshToken({
      userId: user.id,
      deviceInfo: {
        userAgent: (dto as any).userAgent,
        ipAddress: (dto as any).ipAddress,
      },
    });

    this.logger.log(`2FA verified for user: ${user.email}`, 'AuthService', {
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  async signup(dto: SignupRequestDto) {
    // Check if user already exists
    const existingUser = await this.userService.findUserByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create user
    const user = await this.userService.createUser({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });

    // Send email verification
    await this.emailVerificationService.sendVerificationEmail(
      user.id,
      user.email,
    );

    this.logger.log(`User signed up: ${user.email}`, 'AuthService', {
      userId: user.id,
      email: user.email,
    });

    return {
      message:
        'User created successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
      },
    };
  }

  async verifyEmail(dto: VerifyEmailRequestDto) {
    const { userId, email } = await this.emailVerificationService.verifyEmail(
      dto.token,
    );

    // Update user email verification status
    await this.userService.update(userId, { emailVerified: true } as any);

    this.logger.log(`Email verified for user: ${email}`, 'AuthService', {
      userId,
      email,
    });

    return {
      message: 'Email verified successfully',
      user: {
        id: userId,
        email,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordRequestDto) {
    await this.passwordResetService.sendPasswordResetEmail(dto.email);

    return {
      message:
        'If an account with this email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordRequestDto) {
    await this.passwordResetService.resetPassword(dto.token, dto.password);

    return {
      message: 'Password reset successfully',
    };
  }

  async refreshToken(dto: RefreshTokenRequest) {
    const { accessToken, newRefreshToken } =
      await this.refreshTokenService.refreshAccessToken(dto.refreshToken);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async setupTwoFactor(userId: string) {
    const user = await this.userService.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    // Generate 2FA secret and QR code
    const { secret, otpauthUrl, qrCodeUrl } =
      await this.twoFactorService.setupTwoFactor(user.email);

    // Store secret temporarily (not enabled yet)
    await this.userService.updateUserTwoFactor(userId, secret, false);

    this.logger.log(
      `2FA setup initiated for user: ${user.email}`,
      'AuthService',
      {
        userId: user.id,
        email: user.email,
      },
    );

    return {
      secret,
      otpauthUrl,
      qrCodeUrl,
      message: 'Scan the QR code with your authenticator app',
    };
  }

  async enableTwoFactor(userId: string, verificationCode: string) {
    const user = await this.userService.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Please setup 2FA first');
    }

    // Verify the 2FA code
    const isValid = this.twoFactorService.verifyToken(
      verificationCode,
      user.twoFactorSecret,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA verification code');
    }

    // Enable 2FA
    await this.userService.updateUserTwoFactor(
      userId,
      user.twoFactorSecret,
      true,
    );

    this.logger.log(`2FA enabled for user: ${user.email}`, 'AuthService', {
      userId: user.id,
      email: user.email,
    });

    return { message: 'Two-factor authentication enabled successfully' };
  }

  async disableTwoFactor(userId: string, verificationCode: string) {
    const user = await this.userService.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Verify the 2FA code
    const isValid = this.twoFactorService.verifyToken(
      verificationCode,
      user.twoFactorSecret,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA verification code');
    }

    // Disable 2FA
    await this.userService.updateUserTwoFactor(userId, null, false);

    this.logger.log(`2FA disabled for user: ${user.email}`, 'AuthService', {
      userId: user.id,
      email: user.email,
    });

    return { message: 'Two-factor authentication disabled successfully' };
  }

  async logout(userId: string) {
    // Invalidate refresh tokens for the user
    await this.refreshTokenService.deleteAllRefreshTokensForUser(userId);

    this.logger.log(`User ${userId} logged out`, 'AuthService', {
      userId,
    });

    return { message: 'Logged out successfully' };
  }

  private generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
    });

    return {
      accessToken,
      refreshToken: this.generateRefreshToken(),
    };
  }

  private generateRefreshToken(): string {
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    );

    // Store refresh token - userId will be set when the token is actually used
    this.refreshTokenService.createRefreshToken({
      userId: '', // Placeholder, will be updated after login
      token: refreshToken,
      expiresAt: refreshTokenExpiresAt,
    });

    return refreshToken;
  }
}
