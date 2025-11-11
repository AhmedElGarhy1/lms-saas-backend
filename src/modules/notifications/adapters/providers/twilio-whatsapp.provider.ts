import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WhatsAppProvider } from './whatsapp-provider.interface';
import * as twilio from 'twilio';
import { Config } from '@/shared/config/config';

@Injectable()
export class TwilioWhatsAppProvider implements WhatsAppProvider {
  private twilioClient: twilio.Twilio | null = null;
  private readonly fromNumber: string | null;
  private readonly logger: Logger;

  constructor(private readonly moduleRef: ModuleRef) {
    // Use class name as context
    const context = this.constructor.name;
    this.logger = new Logger(context);
    const accountSid = Config.twilio.accountSid;
    const authToken = Config.twilio.authToken;
    this.fromNumber = Config.twilio.whatsappNumber || null;

    if (
      accountSid &&
      authToken &&
      accountSid.trim() !== '' &&
      authToken.trim() !== ''
    ) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
      } catch (error) {
        this.logger.error(
          'Failed to initialize Twilio WhatsApp client',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  isConfigured(): boolean {
    return (
      this.twilioClient !== null &&
      this.fromNumber !== null &&
      this.fromNumber.trim() !== ''
    );
  }

  getProviderName(): string {
    return 'Twilio WhatsApp';
  }

  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Twilio WhatsApp is not configured');
    }

    // Format phone numbers for WhatsApp
    const from = this.fromNumber!.startsWith('whatsapp:')
      ? this.fromNumber!
      : `whatsapp:${this.fromNumber!}`;
    const to = phoneNumber.startsWith('whatsapp:')
      ? phoneNumber
      : `whatsapp:${phoneNumber}`;

    const startTime = Date.now();
    try {
      await this.twilioClient!.messages.create({
        body: message,
        from,
        to,
      });

      const latency = Date.now() - startTime;
      // Debug log removed - routine operation
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const latency = Date.now() - startTime;

      this.logger.error(
        `Failed to send WhatsApp message via Twilio (${latency}ms): ${errorMessage} - recipient: ${phoneNumber}, provider: Twilio WhatsApp`,
        error instanceof Error ? error.stack : String(error),
      );

      // Throw error for BullMQ to handle retry
      throw new Error(
        `Failed to send WhatsApp message via Twilio: ${errorMessage}`,
      );
    }
  }
}
