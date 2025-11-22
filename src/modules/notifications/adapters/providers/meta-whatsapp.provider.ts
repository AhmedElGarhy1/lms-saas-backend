import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import axios, { AxiosError } from 'axios';
import {
  WhatsAppProvider,
  WhatsAppTemplateMessage,
  WhatsAppSendResult,
} from './whatsapp-provider.interface';
import { Config } from '@/shared/config/config';

/**
 * WhatsApp Business API template message payload structure
 */
interface WhatsAppApiPayload {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  template: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: string;
      parameters: Array<{ type: string; text: string }>;
    }>;
  };
}

@Injectable()
export class MetaWhatsAppProvider implements WhatsAppProvider {
  private readonly accessToken: string | null;
  private readonly phoneNumberId: string | null;
  private readonly logger: Logger = new Logger(MetaWhatsAppProvider.name);

  constructor(private readonly moduleRef: ModuleRef) {
    this.accessToken = Config.whatsapp.accessToken || null;
    this.phoneNumberId = Config.whatsapp.phoneNumberId || null;
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

  /**
   * Map locale code to WhatsApp language code format
   * @param locale Locale code (e.g., 'en', 'ar')
   * @returns WhatsApp language code (e.g., 'en_US', 'ar')
   */
  private mapLocaleToWhatsAppLanguage(locale: string): string {
    const localeMap: Record<string, string> = {
      en: 'en_US',
      ar: 'ar',
      es: 'es_ES',
      fr: 'fr_FR',
    };
    return localeMap[locale] || locale;
  }

  /**
   * Build WhatsApp API payload from template message
   * @param phoneNumber Recipient phone number (E.164 format)
   * @param templateMessage Template message structure
   * @returns WhatsApp API payload
   */
  private buildApiPayload(
    phoneNumber: string,
    templateMessage: WhatsAppTemplateMessage,
  ): WhatsAppApiPayload {
    const payload: WhatsAppApiPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateMessage.templateName,
        language: {
          code: this.mapLocaleToWhatsAppLanguage(
            templateMessage.templateLanguage,
          ),
        },
      },
    };

    // Only include components if there are parameters
    if (
      templateMessage.templateParameters &&
      templateMessage.templateParameters.length > 0
    ) {
      payload.template.components = [
        {
          type: 'body',
          parameters: templateMessage.templateParameters,
        },
      ];
    }

    return payload;
  }

  /**
   * Extract error message from axios error
   * @param error Error object
   * @returns Formatted error message
   */
  private extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<unknown>;

      if (axiosError.response) {
        // Response received with error status
        const errorDetails = axiosError.response.data;
        return `WhatsApp Business API error: ${axiosError.response.status} - ${JSON.stringify(errorDetails)}`;
      } else if (axiosError.request) {
        // Request was made but no response received (network/timeout)
        return `WhatsApp Business API request failed: No response received - ${axiosError.message}`;
      } else {
        // Error setting up request
        return `WhatsApp Business API request setup failed: ${axiosError.message}`;
      }
    }

    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Send a WhatsApp template message via Meta Business API
   * @param phoneNumber Recipient phone number (E.164 format)
   * @param templateMessage Template message structure
   * @returns Message ID from Meta API
   */
  async sendMessage(
    phoneNumber: string,
    templateMessage: WhatsAppTemplateMessage,
  ): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp Business API is not configured');
    }

    const startTime = Date.now();
    try {
      const payload = this.buildApiPayload(phoneNumber, templateMessage);

      const response = await axios.post<{
        messages: Array<{ id: string }>;
      }>(
        `https://graph.facebook.com/v23.0/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        },
      );

      // Extract message ID from response
      const messageId = response.data?.messages?.[0]?.id;

      if (!messageId) {
        throw new Error(
          'WhatsApp API response missing message ID',
        );
      }

      return { messageId };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = this.extractErrorMessage(error);

      this.logger.error(
        `Failed to send WhatsApp template message via Business API (${latency}ms): ${errorMessage} - recipient: ${phoneNumber}, template: ${templateMessage.templateName}, provider: Meta WhatsApp Business API`,
        error instanceof Error ? error.stack : undefined,
      );

      // Throw error for BullMQ to handle retry
      throw new Error(
        `Failed to send WhatsApp template message via Business API: ${errorMessage}`,
      );
    }
  }
}
