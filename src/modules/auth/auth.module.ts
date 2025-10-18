import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './services/auth.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { EmailVerificationRepository } from './repositories/email-verification.repository';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
// import { TwoFactorService } from './services/two-factor.service';
import { AuthController } from './controllers/auth.controller';
import { User } from '../user/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh.strategy';
import { UserModule } from '../user/user.module';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([
      User,
      RefreshToken,
      EmailVerification,
      PasswordResetToken,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailVerificationService,
    PasswordResetService,
    RefreshTokenService,
    EmailVerificationRepository,
    PasswordResetRepository,
    RefreshTokenRepository,
    // TwoFactorService,
    UserRepository,
    JwtStrategy,
    RefreshTokenStrategy,
  ],
  exports: [
    AuthService,
    EmailVerificationService,
    PasswordResetService,
    RefreshTokenService,
    EmailVerificationRepository,
    PasswordResetRepository,
    RefreshTokenRepository,
    // TwoFactorService,
    JwtStrategy,
    RefreshTokenStrategy,
  ],
})
export class AuthModule {}
