import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@/shared/services/logger.service';
import { WhatsAppProvider } from './whatsapp-provider.interface';
import * as twilio from 'twilio';

@Injectable()
export class TwilioWhatsAppProvider implements WhatsAppProvider {
  private twilioClient: twilio.Twilio | null = null;
  private readonly fromNumber: string | null;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.config.get<string>('TWILIO_WHATSAPP_NUMBER') || null;

    if (
      accountSid &&
      authToken &&
      accountSid.trim() !== '' &&
      authToken.trim() !== ''
    ) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        this.logger.debug(
          'Twilio WhatsApp client initialized successfully',
          'TwilioWhatsAppProvider',
        );
      } catch (error) {
        this.logger.error(
          'Failed to initialize Twilio WhatsApp client',
          error instanceof Error ? error.stack : undefined,
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
      this.logger.debug(
        `WhatsApp message sent successfully via Twilio (${latency}ms)`,
        'TwilioWhatsAppProvider',
        {
          recipient: phoneNumber,
          provider: 'Twilio WhatsApp',
          latency,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const latency = Date.now() - startTime;

      this.logger.error(
        `Failed to send WhatsApp message via Twilio (${latency}ms): ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'TwilioWhatsAppProvider',
        {
          recipient: phoneNumber,
          provider: 'Twilio WhatsApp',
          error: errorMessage,
          latency,
        },
      );

      // Throw error for BullMQ to handle retry
      throw new Error(
        `Failed to send WhatsApp message via Twilio: ${errorMessage}`,
      );
    }
  }
}
