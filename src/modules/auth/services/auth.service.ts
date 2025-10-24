import { Injectable } from '@nestjs/common';
import {
  AuthenticationFailedException,
  ResourceNotFoundException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '../../../shared/services/mailer.service';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/services/user.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordResetService } from './password-reset.service';
// import { TwoFactorService } from './two-factor.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginRequestDto } from '../dto/login.dto';
import { SignupRequestDto } from '../dto/signup.dto';
import { ForgotPasswordRequestDto } from '../dto/forgot-password.dto';
import { ResetPasswordRequestDto } from '../dto/reset-password.dto';
import { VerifyEmailRequestDto } from '../dto/verify-email.dto';
import { TwoFactorRequest } from '../dto/2fa.dto';
import { LoggerService } from '../../../shared/services/logger.service';
import { User } from '../../user/entities/user.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { Transactional } from '@nestjs-cls/transactional';
import { JwtPayload } from '../strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    // private readonly twoFactorService: TwoFactorService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly activityLogService: ActivityLogService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  async validateUser(
    emailOrPhone: string,
    password: string,
  ): Promise<User | null> {
    // Determine if it's an email or phone and find user accordingly
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
    const user = isEmail
      ? await this.userService.findUserByEmail(emailOrPhone, true)
      : await this.userService.findUserByPhone(emailOrPhone, true);

    if (!user) {
      // Log failed login attempt - user not found
      await this.activityLogService.log(ActivityType.USER_LOGIN_FAILED, {
        email: emailOrPhone,
        reason: 'User not found',
      });
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Log failed login attempt - invalid password
      await this.activityLogService.log(ActivityType.USER_LOGIN_FAILED, {
        email: emailOrPhone,
        userId: user.id,
        reason: 'Invalid password',
      });
      return null;
    }

    return user;
  }

  async login(dto: LoginRequestDto) {
    const user = await this.validateUser(dto.emailOrPhone, dto.password);
    if (!user) {
      this.logger.warn(
        `Failed login attempt for email/phone: ${dto.emailOrPhone}`,
      );
      throw new AuthenticationFailedException('Invalid credentials');
    }

    if (!user.id || user.id.trim() === '') {
      this.logger.error(
        `User object missing or invalid ID for email/phone: ${dto.emailOrPhone}`,
        'AuthService',
      );
      throw new AuthenticationFailedException('User data is invalid');
    }

    if (!user.isActive) {
      this.logger.warn(`Login attempt for inactive user: ${dto.emailOrPhone}`);
      throw new BusinessLogicException(
        'Account is deactivated',
        'Your account has been deactivated',
        'Please contact an administrator to reactivate your account',
      );
    }

    // Check if user is locked out
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      this.logger.warn(`Login attempt for locked user: ${dto.emailOrPhone}`);
      throw new BusinessLogicException(
        'Account is temporarily locked',
        'Your account is temporarily locked due to multiple failed login attempts',
        'Please try again later or contact support',
      );
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await this.userService.updateFailedLoginAttempts(user.id, 0);
      await this.userService.updateLockoutUntil(user.id, null);
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate and send 2FA code
      // TODO: Re-enable 2FA functionality when TwoFactorService is fixed
      // const twoFactorCode = this.twoFactorService.generateToken(
      //   user.twoFactorSecret,
      // );
      const twoFactorCode = 'DISABLED';
      // In a real implementation, you would send this via SMS or email
      this.logger.log(`2FA code for ${dto.emailOrPhone}: ${twoFactorCode}`);

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

    // Hash and store refresh token in database
    const hashedRt = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userService.update(user.id, { hashedRt });

    this.logger.log(
      `Creating refresh token for user: ${user.email} (ID: ${user.id})`,
      'AuthService',
    );

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

  async verify2FA(dto: TwoFactorRequest) {
    // Find user by email
    const user = await this.userService.findUserByEmail(dto.email);

    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BusinessLogicException(
        'Two-factor authentication is not enabled',
        '2FA is not set up for this account',
        'Please set up two-factor authentication first',
      );
    }

    // TODO: Re-enable 2FA functionality when TwoFactorService is fixed
    // const isValid = this.twoFactorService.verifyToken(
    //   dto.code,
    //   user.twoFactorSecret,
    // );
    const isValid = true; // Temporarily disabled

    if (!isValid) {
      throw new AuthenticationFailedException('Invalid 2FA code');
    }

    // Generate final tokens
    const tokens = this.generateTokens(user);

    // Hash and store refresh token in database
    const hashedRt = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userService.update(user.id, { hashedRt });

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
    // // Check if user already exists
    // const existingUser = await this.userService.findUserByEmail(dto.email);
    // if (existingUser) {
    //   throw new ConflictException('User with this email already exists');
    // }
    // // Create user
    // const user = await this.userService.createUser({
    //   email: dto.email,
    //   password: dto.password,
    //   name: dto.name,
    //   // TODO: add profile correctly
    //   profile: {
    //     phone: '',
    //     address: '',
    //     dateOfBirth: '',
    //   },
    // });
    // // Send email verification
    // await this.emailVerificationService.sendVerificationEmail(
    //   user.id,
    //   user.email,
    // );
    // this.logger.log(`User signed up: ${user.email}`, 'AuthService', {
    //   userId: user.id,
    //   email: user.email,
    // });
    // return {
    //   message:
    //     'User created successfully. Please check your email to verify your account.',
    //   user: {
    //     id: user.id,
    //     email: user.email,
    //     name: user.name,
    //     isActive: user.isActive,
    //   },
    // };
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
    // Use newPassword from the DTO
    await this.passwordResetService.resetPassword(dto.token, dto.newPassword);
    return {
      success: true,
      message: this.i18n.translate('success.passwordReset'),
    };
  }

  async setupTwoFactor(userId: string, actor: ActorUser) {
    const user = await this.userService.findOne(userId, true);

    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BusinessLogicException(
        'Two-factor authentication is already enabled',
      );
    }

    // TODO: Re-enable 2FA functionality when TwoFactorService is fixed
    // Generate 2FA secret and QR code
    // const { secret, otpauthUrl, qrCodeUrl } =
    //   await this.twoFactorService.setupTwoFactor(user.email);
    const { secret, otpauthUrl, qrCodeUrl } = {
      secret: 'DISABLED',
      otpauthUrl: 'DISABLED',
      qrCodeUrl: 'DISABLED',
    };

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

  async enableTwoFactor(
    userId: string,
    verificationCode: string,
    actor: ActorUser,
  ) {
    const user = await this.userService.findOne(userId, true);

    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BusinessLogicException(
        'Two-factor authentication is already enabled',
      );
    }

    if (!user.twoFactorSecret) {
      throw new BusinessLogicException('Please setup 2FA first');
    }

    // TODO: Re-enable 2FA functionality when TwoFactorService is fixed
    // Verify the 2FA code
    // const isValid = this.twoFactorService.verifyToken(
    //   verificationCode,
    //   user.twoFactorSecret,
    // );
    const isValid = true; // Temporarily disabled
    if (!isValid) {
      throw new AuthenticationFailedException('Invalid 2FA verification code');
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

  async disableTwoFactor(
    userId: string,
    verificationCode: string,
    actor: ActorUser,
  ) {
    const user = await this.userService.findOne(userId, true);

    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BusinessLogicException(
        'Two-factor authentication is not enabled',
      );
    }

    // TODO: Re-enable 2FA functionality when TwoFactorService is fixed
    // Verify the 2FA code
    // const isValid = this.twoFactorService.verifyToken(
    //   verificationCode,
    //   user.twoFactorSecret,
    // );
    const isValid = true; // Temporarily disabled
    if (!isValid) {
      throw new AuthenticationFailedException('Invalid 2FA verification code');
    }

    // Disable 2FA
    await this.userService.updateUserTwoFactor(userId, null, false);

    this.logger.log(`2FA disabled for user: ${user.email}`, 'AuthService', {
      userId: user.id,
      email: user.email,
    });

    return { message: 'Two-factor authentication disabled successfully' };
  }

  async logout(actor: ActorUser) {
    // Clear hashed refresh token from database
    await this.userService.update(actor.id, { hashedRt: null });

    this.logger.log(`User ${actor.id} logged out`, 'AuthService', {
      userId: actor.id,
    });

    return { message: 'Logged out successfully' };
  }

  private generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(
      { ...payload, type: 'access' },
      {
        expiresIn: this.configService.get('JWT_EXPIRES_IN'),
      },
    );
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  decodeToken(token: string) {
    return this.jwtService.decode(token) as any;
  }

  async refresh(userId: string, refreshToken: string) {
    // Get user (validation already done by strategy)
    const user = await this.userService.findOne(userId, true);
    if (!user) {
      throw new AuthenticationFailedException('User not found');
    }

    // Generate new tokens
    const tokens = this.generateTokens(user);

    // Update hashed refresh token in database (token rotation)
    await this.userService.update(user.id, {
      hashedRt: await bcrypt.hash(tokens.refreshToken, 10),
    });

    return tokens;
  }
}
