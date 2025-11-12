import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WhatsAppProvider } from './whatsapp-provider.interface';
import { Config } from '@/shared/config/config';

@Injectable()
export class MetaWhatsAppProvider implements WhatsAppProvider {
  private readonly accessToken: string | null;
  private readonly phoneNumberId: string | null;
  private readonly logger: Logger = new Logger(MetaWhatsAppProvider.name);

  constructor(private readonly moduleRef: ModuleRef) {
    this.accessToken = Config.whatsapp.accessToken || null;
    this.phoneNumberId = Config.whatsapp.phoneNumberId || null;

    if (this.isConfigured()) {
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
      // Debug log removed - routine operation
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const latency = Date.now() - startTime;

      this.logger.error(
        `Failed to send WhatsApp message via Business API (${latency}ms): ${errorMessage} - recipient: ${phoneNumber}, provider: Meta WhatsApp Business API`,
        error instanceof Error ? error.stack : String(error),
      );

      // Throw error for BullMQ to handle retry
      throw new Error(
        `Failed to send WhatsApp message via Business API: ${errorMessage}`,
      );
    }
  }
}
