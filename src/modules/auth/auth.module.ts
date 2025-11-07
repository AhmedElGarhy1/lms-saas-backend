import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Config } from '@/shared/config/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthService } from './services/auth.service';
import { VerificationService } from './services/verification.service';
import { VerificationTokenRepository } from './repositories/verification-token.repository';
// import { TwoFactorService } from './services/two-factor.service';
import { AuthController } from './controllers/auth.controller';
import { User } from '../user/entities/user.entity';
import { VerificationToken } from './entities/verification-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
import { AccessJwtGuard } from './guards/access-jwt.guard';
import { RefreshJwtGuard } from './guards/refresh-jwt.guard';
import { UserModule } from '../user/user.module';
import { UserRepository } from '../user/repositories/user.repository';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { AuthListener } from './listeners/auth.listener';

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([User, VerificationToken]),
    ActivityLogModule,
    EventEmitterModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: Config.jwt.secret,
        signOptions: {
          expiresIn: Config.jwt.expiresIn,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    VerificationService,
    VerificationTokenRepository,
    // TwoFactorService,
    UserRepository,
    JwtStrategy,
    RefreshJwtStrategy,
    AccessJwtGuard,
    RefreshJwtGuard,
    AuthListener,
  ],
  exports: [
    AuthService,
    VerificationService,
    VerificationTokenRepository,
    // TwoFactorService,
    JwtStrategy,
    RefreshJwtStrategy,
    AccessJwtGuard,
    RefreshJwtGuard,
  ],
})
export class AuthModule {}
