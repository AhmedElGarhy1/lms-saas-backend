import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationIntentResolver } from './interfaces/notification-intent-resolver.interface';
import { CenterCreatedResolver } from './resolvers/center-created.resolver';
import { CenterUpdatedResolver } from './resolvers/center-updated.resolver';
import { OtpResolver } from './resolvers/otp.resolver';
import { PhoneVerifiedResolver } from './resolvers/phone-verified.resolver';

/**
 * Registry service for notification intent resolvers
 * Maps NotificationType to resolver instances
 */
@Injectable()
export class NotificationIntentResolverRegistryService implements OnModuleInit {
  private resolvers = new Map<
    NotificationType,
    NotificationIntentResolver<NotificationType>
  >();

  constructor(
    private readonly centerCreatedResolver: CenterCreatedResolver,
    private readonly centerUpdatedResolver: CenterUpdatedResolver,
    private readonly otpResolver: OtpResolver,
    private readonly phoneVerifiedResolver: PhoneVerifiedResolver,
  ) {}

  onModuleInit(): void {
    // Register all resolvers
    this.register(NotificationType.CENTER_CREATED, this.centerCreatedResolver);
    this.register(NotificationType.CENTER_UPDATED, this.centerUpdatedResolver);
    this.register(NotificationType.OTP, this.otpResolver);
    this.register(NotificationType.PHONE_VERIFIED, this.phoneVerifiedResolver);
  }

  /**
   * Register a resolver for a notification type
   */
  private register<T extends NotificationType>(
    type: T,
    resolver: NotificationIntentResolver<T>,
  ): void {
    this.resolvers.set(type, resolver);
  }

  /**
   * Get resolver for a notification type
   */
  get<T extends NotificationType>(type: T) {
    return this.resolvers.get(type);
  }
}
