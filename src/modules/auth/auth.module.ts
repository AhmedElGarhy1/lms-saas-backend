import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Config } from '@/shared/config/config';
import { AuthService } from './services/auth.service';
import { VerificationService } from './services/verification.service';
import { VerificationTokenRepository } from './repositories/verification-token.repository';
import { AuthController } from './controllers/auth.controller';
import { User } from '../user/entities/user.entity';
import { VerificationToken } from './entities/verification-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
import { AccessJwtGuard } from './guards/access-jwt.guard';
import { RefreshJwtGuard } from './guards/refresh-jwt.guard';
import { UserModule } from '../user/user.module';
import { UserRepository } from '../user/repositories/user.repository';
import { AuthListener } from './listeners/auth.listener';
import { VerificationListener } from './listeners/verification.listener';
import { ClassesModule } from '../classes/classes.module';

@Module({
  imports: [
    UserModule,
    ClassesModule,
    TypeOrmModule.forFeature([User, VerificationToken]),
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
    UserRepository,
    JwtStrategy,
    RefreshJwtStrategy,
    AccessJwtGuard,
    RefreshJwtGuard,
    AuthListener,
    VerificationListener,
  ],
  exports: [
    AuthService,
    VerificationService,
    VerificationTokenRepository,
    JwtStrategy,
    RefreshJwtStrategy,
    AccessJwtGuard,
    RefreshJwtGuard,
  ],
})
export class AuthModule {}
