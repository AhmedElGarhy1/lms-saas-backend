import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { UserDeviceRepository } from '../repositories/user-device.repository';

/**
 * HTTP Headers type - compatible with both Express and Node.js headers
 */
type HttpHeaders = Record<string, string | string[] | undefined>;

/**
 * Simple Device Service
 *
 * Generates fingerprint from request headers (server-side, no frontend needed).
 * Tracks user devices for "new device login" detection.
 */
@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(private readonly userDeviceRepository: UserDeviceRepository) {}

  /**
   * Check if device is new for the user
   *
   * @param userId - User ID
   * @param headers - HTTP request headers
   * @param options - Optional { fcmToken } to store on the device
   * @returns { isNew: boolean, deviceName: string }
   */
  async checkDevice(
    userId: string,
    headers: HttpHeaders,
    options?: { fcmToken?: string },
  ): Promise<{ isNew: boolean; deviceName: string }> {
    const { fingerprint, deviceName } = this.getDeviceInfoFromHeaders(headers);

    const device = await this.userDeviceRepository.findByFingerprint(
      userId,
      fingerprint,
    );

    const now = new Date();

    if (!device) {
      await this.userDeviceRepository.create({
        userId,
        fingerprint,
        deviceName,
        lastUsedAt: now,
        ...(options?.fcmToken && { fcmToken: options.fcmToken }),
      });

      this.logger.log(`New device detected for user ${userId}: ${deviceName}`);
      return { isNew: true, deviceName };
    }

    const updatePayload: { lastUsedAt: Date; fcmToken?: string } = {
      lastUsedAt: now,
    };
    if (options?.fcmToken) {
      updatePayload.fcmToken = options.fcmToken;
    }
    await this.userDeviceRepository.update(device.id, updatePayload);

    return { isNew: false, deviceName };
  }

  /**
   * Register or update FCM token for the current device (fingerprint from headers).
   * Used on app start and on token refresh.
   */
  async registerFcmToken(
    userId: string,
    headers: HttpHeaders,
    dto: { fcmToken: string; deviceName?: string },
  ): Promise<void> {
    const { fingerprint, deviceName } = this.getDeviceInfoFromHeaders(headers);
    const device = await this.userDeviceRepository.findByFingerprint(
      userId,
      fingerprint,
    );

    const now = new Date();
    const payload = {
      fcmToken: dto.fcmToken,
      lastUsedAt: now,
      ...(dto.deviceName != null && { deviceName: dto.deviceName }),
    };

    if (!device) {
      await this.userDeviceRepository.create({
        userId,
        fingerprint,
        deviceName: dto.deviceName ?? deviceName,
        lastUsedAt: now,
        fcmToken: dto.fcmToken,
      });
      return;
    }

    await this.userDeviceRepository.update(device.id, payload);
  }

  private getDeviceInfoFromHeaders(headers: HttpHeaders): {
    fingerprint: string;
    deviceName: string;
  } {
    const userAgentRaw = headers['user-agent'];
    const userAgent = Array.isArray(userAgentRaw)
      ? userAgentRaw[0]
      : userAgentRaw || '';
    const acceptLanguageRaw = headers['accept-language'];
    const acceptLanguage = Array.isArray(acceptLanguageRaw)
      ? acceptLanguageRaw[0]
      : acceptLanguageRaw || '';
    const fingerprint = this.generateFingerprint(userAgent, acceptLanguage);
    const deviceName = this.parseDeviceName(userAgent);
    return { fingerprint, deviceName };
  }

  /**
   * Generate fingerprint from User-Agent and Accept-Language
   * MD5 hash is sufficient for device identification (not security-critical)
   */
  private generateFingerprint(
    userAgent: string,
    acceptLanguage: string,
  ): string {
    return crypto
      .createHash('md5')
      .update(userAgent + acceptLanguage)
      .digest('hex');
  }

  /**
   * Parse device name from User-Agent header
   * Returns a human-readable device name like "Chrome on Windows"
   */
  private parseDeviceName(userAgent: string): string {
    if (!userAgent) {
      return 'Unknown Device';
    }

    // Detect browser
    let browser = 'Unknown Browser';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      browser = 'Opera';
    }

    // Detect OS
    let os = 'Unknown OS';
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }

    return `${browser} on ${os}`;
  }

  /**
   * Get all devices for a user (for "manage devices" feature)
   */
  async getUserDevices(userId: string) {
    return this.userDeviceRepository.findByUserId(userId);
  }

  /**
   * Remove a device (for "logout from device" feature)
   */
  async removeDevice(userId: string, deviceId: string): Promise<boolean> {
    const device = await this.userDeviceRepository.findOne(deviceId);

    if (!device || device.userId !== userId) {
      return false;
    }

    await this.userDeviceRepository.softRemove(deviceId);
    return true;
  }
}
