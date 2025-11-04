import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@/shared/services/logger.service';
import { WhatsAppProvider } from './whatsapp-provider.interface';

@Injectable()
export class MetaWhatsAppProvider implements WhatsAppProvider {
  private readonly accessToken: string | null;
  private readonly phoneNumberId: string | null;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN') || null;
    this.phoneNumberId =
      this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || null;

    if (this.isConfigured()) {
      this.logger.debug(
        'WhatsApp Business API (Meta) provider initialized',
        'MetaWhatsAppProvider',
      );
    }
  }

  isConfigured(): boolean {
    return (
      this.accessToken !== null &&
      this.phoneNumberId !== null &&
      this.accessToken.trim() !== '' &&
      this.phoneNumberId.trim() !== ''
    );
  }

  getProviderName(): string {
    return 'Meta WhatsApp Business API';
  }

  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp Business API is not configured');
    }

    const startTime = Date.now();
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'text',
            text: { body: message },
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `WhatsApp Business API error: ${response.status} - ${JSON.stringify(errorData)}`,
        );
      }

      const latency = Date.now() - startTime;
      this.logger.debug(
        `WhatsApp message sent successfully via Business API (${latency}ms)`,
        'MetaWhatsAppProvider',
        {
          recipient: phoneNumber,
          provider: 'Meta WhatsApp Business API',
          latency,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const latency = Date.now() - startTime;

      this.logger.error(
        `Failed to send WhatsApp message via Business API (${latency}ms): ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'MetaWhatsAppProvider',
        {
          recipient: phoneNumber,
          provider: 'Meta WhatsApp Business API',
          error: errorMessage,
          latency,
        },
      );

      // Throw error for BullMQ to handle retry
      throw new Error(
        `Failed to send WhatsApp message via Business API: ${errorMessage}`,
      );
    }
  }
}
