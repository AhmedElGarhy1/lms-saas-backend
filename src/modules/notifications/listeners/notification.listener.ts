import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
} from '@/modules/centers/events/center.events';
import {
  OtpEvent,
  PhoneVerifiedEvent,
} from '@/modules/auth/events/auth.events';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationIntentService } from '../services/notification-intent.service';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';

@Injectable()
export class NotificationListener implements OnModuleInit {
  private readonly logger: Logger = new Logger(NotificationListener.name);

  constructor(
    private readonly intentService: NotificationIntentService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {}

  onModuleInit(): void {
    // Register type-safe event listeners
    // Using TypeSafeEventEmitter ensures compile-time type safety between event name and payload type
    this.typeSafeEventEmitter.on(CenterEvents.CREATED, (event) => {
      void this.handleCenterCreated(event);
    });
    this.typeSafeEventEmitter.on(CenterEvents.UPDATED, (event) => {
      void this.handleCenterUpdated(event);
    });
    this.typeSafeEventEmitter.on(AuthEvents.OTP, (event) => {
      void this.handleOtp(event);
    });
    this.typeSafeEventEmitter.on(AuthEvents.PHONE_VERIFIED, (event) => {
      void this.handlePhoneVerified(event);
    });
  }

  private async handleCenterCreated(event: CreateCenterEvent) {
    // Emit intent - resolver will handle all audiences (OWNER, ADMIN)
    // The processor loops through audiences and calls resolver for each
    await this.intentService.enqueue(NotificationType.CENTER_CREATED, {
      centerId: event.center.id,
      actorId: event.actor.id,
    });
  }

  private async handleCenterUpdated(event: UpdateCenterEvent) {
    // Emit intent - resolver will fetch center and resolve recipients
    await this.intentService.enqueue(NotificationType.CENTER_UPDATED, {
      centerId: event.centerId,
      actorId: event.actor.id,
    });
  }

  private async handleOtp(event: OtpEvent) {
    // Emit intent with template variables (otpCode, expiresIn)
    // Resolver will fetch user and resolve recipients
    await this.intentService.enqueue(NotificationType.OTP, {
      userId: event.userId,
      otpCode: event.otpCode,
      expiresIn: event.expiresIn,
    });
  }

  private async handlePhoneVerified(event: PhoneVerifiedEvent) {
    // Emit intent - resolver will fetch user and resolve recipients
    await this.intentService.enqueue(NotificationType.PHONE_VERIFIED, {
      userId: event.userId,
    });
  }
}
