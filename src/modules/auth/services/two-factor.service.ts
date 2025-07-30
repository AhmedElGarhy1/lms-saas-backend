import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { LoggerService } from '../../../shared/services/logger.service';

@Injectable()
export class TwoFactorService {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Generate a new 2FA secret for a user
   */
  generateSecret(
    userEmail: string,
    serviceName: string = 'LMS SaaS',
  ): {
    secret: string;
    otpauthUrl: string;
    qrCodeUrl: string;
  } {
    const secret = speakeasy.generateSecret({
      name: `${serviceName}:${userEmail}`,
      issuer: serviceName,
      length: 32,
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url!,
      qrCodeUrl: '', // Will be generated separately
    };
  }

  /**
   * Generate QR code URL for Google Authenticator
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      this.logger.error('Failed to generate QR code', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a 2FA token
   */
  verifyToken(token: string, secret: string, window: number = 2): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window, // Allow for time drift (2 time steps = 60 seconds)
      });
    } catch (error) {
      this.logger.error('Failed to verify 2FA token', error);
      return false;
    }
  }

  /**
   * Generate a 2FA token (for testing purposes)
   */
  generateToken(secret: string): string {
    try {
      return speakeasy.totp({
        secret,
        encoding: 'base32',
      });
    } catch (error) {
      this.logger.error('Failed to generate 2FA token', error);
      throw new Error('Failed to generate 2FA token');
    }
  }

  /**
   * Setup 2FA for a user
   */
  async setupTwoFactor(
    userEmail: string,
    serviceName?: string,
  ): Promise<{
    secret: string;
    otpauthUrl: string;
    qrCodeUrl: string;
  }> {
    const { secret, otpauthUrl } = this.generateSecret(userEmail, serviceName);
    const qrCodeUrl = await this.generateQRCode(otpauthUrl);

    this.logger.log(`2FA setup initiated for user: ${userEmail}`);

    return {
      secret,
      otpauthUrl,
      qrCodeUrl,
    };
  }

  /**
   * Verify 2FA setup with a test token
   */
  verifySetup(token: string, secret: string): boolean {
    return this.verifyToken(token, secret);
  }
}
