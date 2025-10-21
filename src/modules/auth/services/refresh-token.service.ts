import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Transactional } from 'typeorm-transactional';

export interface CreateRefreshTokenData {
  userId: string;
  token?: string;
  expiresAt?: Date;
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
    deviceId?: string;
  };
}

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  async createRefreshToken(data: CreateRefreshTokenData) {
    const token = data.token || this.generateRefreshToken();
    const expiresAt = data.expiresAt || this.getDefaultExpiration();

    const refreshToken = await this.refreshTokenRepository.createRefreshToken({
      userId: data.userId,
      token,
      expiresAt,
    });

    this.logger.log(
      `Refresh token created for user: ${data.userId}`,
      'RefreshTokenService',
      {
        userId: data.userId,
        expiresAt,
        deviceInfo: data.deviceInfo,
      },
    );

    return refreshToken;
  }

  async findRefreshToken(token: string) {
    const refreshToken =
      await this.refreshTokenRepository.findRefreshToken(token);

    if (!refreshToken) {
      throw new NotFoundException('Refresh token not found');
    }

    if (refreshToken.expiresAt < new Date()) {
      await this.deleteRefreshToken(token);
      throw new UnauthorizedException('Refresh token has expired');
    }

    return refreshToken;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepository.deleteRefreshToken(token);

    this.logger.log(`Refresh token deleted: ${token}`, 'RefreshTokenService');
  }

  async deleteAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.refreshTokenRepository.deleteAllRefreshTokensForUser(userId);

    this.logger.log(
      `Deleted all refresh tokens for user: ${userId}`,
      'RefreshTokenService',
      {
        userId,
      },
    );
  }

  async validateRefreshToken(
    token: string,
  ): Promise<{ userId: string; deviceInfo?: any }> {
    const refreshToken = await this.findRefreshToken(token);

    return {
      userId: refreshToken.userId,
      deviceInfo: undefined, // deviceInfo not implemented in current entity
    };
  }

  @Transactional()
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; newRefreshToken?: string }> {
    const tokenData = await this.validateRefreshToken(refreshToken);

    // Generate new access token
    const accessToken = this.generateAccessToken(tokenData.userId);

    // Optionally rotate refresh token for security
    const shouldRotate =
      this.configService.get('REFRESH_TOKEN_ROTATION', 'true') === 'true';

    if (shouldRotate) {
      // Delete old refresh token
      await this.deleteRefreshToken(refreshToken);

      // Create new refresh token
      const newRefreshToken = await this.createRefreshToken({
        userId: tokenData.userId,
        deviceInfo: tokenData.deviceInfo,
      });

      this.logger.log(
        `Refresh token rotated for user: ${tokenData.userId}`,
        'RefreshTokenService',
        {
          userId: tokenData.userId,
        },
      );

      return {
        accessToken,
        newRefreshToken: newRefreshToken.token,
      };
    }

    return { accessToken };
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository.deleteExpiredTokens();

    this.logger.log(`Cleaned up expired refresh tokens`, 'RefreshTokenService');
  }

  async revokeAllUserSessions(
    userId: string,
    _exceptToken?: string,
  ): Promise<void> {
    // For now, just delete all tokens for the user
    // In a more sophisticated implementation, you'd query and filter
    await this.deleteAllRefreshTokensForUser(userId);

    this.logger.log(
      `Revoked all sessions for user: ${userId}`,
      'RefreshTokenService',
      {
        userId,
      },
    );
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private generateAccessToken(_userId: string): string {
    // This would typically use JWT service
    // For now, return a placeholder
    return `access_${crypto.randomBytes(32).toString('hex')}`;
  }

  private getDefaultExpiration(): Date {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const expirationDays = this.configService.get(
      'REFRESH_TOKEN_EXPIRES_DAYS',
      '7',
    );
    return new Date(
      Date.now() + parseInt(String(expirationDays), 10) * 24 * 60 * 60 * 1000,
    );
  }
}
