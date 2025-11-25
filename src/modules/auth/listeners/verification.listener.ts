import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VerificationService } from '../services/verification.service';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { RequestPhoneVerificationEvent } from '../events/auth.events';

/**
 * Listener for verification request events
 * Handles phone and email verification requests from any module
 */
@Injectable()
export class VerificationListener {
  private readonly logger: Logger = new Logger(VerificationListener.name);

  constructor(private readonly verificationService: VerificationService) {}

  /**
   * Handle phone verification request event
   * Can be emitted from any module to trigger phone verification
   */
  @OnEvent(AuthEvents.PHONE_VERIFICATION_SEND_REQUESTED)
  async handlePhoneVerificationRequested(
    event: RequestPhoneVerificationEvent,
  ): Promise<void> {
    try {
      await this.verificationService.sendPhoneVerification(
        event.userId,
        event.phone,
      );
      this.logger.log(`Phone verification requested for user ${event.userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send phone verification for user ${event.userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't throw - let the error be logged but don't fail the event
    }
  }

}
