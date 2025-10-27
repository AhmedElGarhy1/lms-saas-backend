import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './services/auth.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { EmailVerificationRepository } from './repositories/email-verification.repository';
import { PasswordResetRepository } from './repositories/password-reset.repository';
// import { TwoFactorService } from './services/two-factor.service';
import { AuthController } from './controllers/auth.controller';
import { User } from '../user/entities/user.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
import { AccessJwtGuard } from './guards/access-jwt.guard';
import { RefreshJwtGuard } from './guards/refresh-jwt.guard';
import { UserModule } from '../user/user.module';
import { UserRepository } from '../user/repositories/user.repository';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { ActivityLogListener } from './listeners/activity-log.listener';

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([User, EmailVerification, PasswordResetToken]),
    ActivityLogModule,
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
    EmailVerificationRepository,
    PasswordResetRepository,
    // TwoFactorService,
    UserRepository,
    JwtStrategy,
    RefreshJwtStrategy,
    AccessJwtGuard,
    RefreshJwtGuard,
    ActivityLogListener,
  ],
  exports: [
    AuthService,
    EmailVerificationService,
    PasswordResetService,
    EmailVerificationRepository,
    PasswordResetRepository,
    // TwoFactorService,
    JwtStrategy,
    RefreshJwtStrategy,
    AccessJwtGuard,
    RefreshJwtGuard,
  ],
})
export class AuthModule {}
