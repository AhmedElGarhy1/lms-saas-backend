import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import {
  IPaymentGatewayAdapter,
  PaymentGatewayConfig,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatusResponse,
  RefundPaymentRequest,
  RefundPaymentResponse,
  WebhookEvent,
} from './interfaces/payment-gateway.interface';
import { Money } from '@/shared/common/utils/money.util';

@Injectable()
export class PaymobAdapter implements IPaymentGatewayAdapter {
  private readonly logger = new Logger(PaymobAdapter.name);
  private readonly httpClient: AxiosInstance;
  private readonly supportedCurrencies = ['EGP', 'USD'];

  constructor(private config: PaymentGatewayConfig) {
    // Validate configuration - require at least one integration ID
    const integrationIds = [
      config.cardIntegrationId,
      config.walletIntegrationId,
      config.paypalIntegrationId,
    ].filter((id) => id && id.trim() !== '');

    if (integrationIds.length === 0) {
      throw new Error(
        'Paymob adapter requires at least one integration ID (card, wallet, PayPal, or kiosk) for unified intention API',
      );
    }

    if (!config.publicKey) {
      throw new Error(
        'Paymob adapter requires publicKey for unified checkout URL',
      );
    }

    if (!config.secretKey) {
      throw new Error(
        'Paymob adapter requires secretKey for API authentication',
      );
    }

    // Initialize axios client for Paymob Unified Intention API
    this.httpClient = axios.create({
      baseURL: 'https://accept.paymob.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  getName(): string {
    return 'paymob';
  }

  async createPayment(
    request: CreatePaymentRequest,
  ): Promise<CreatePaymentResponse> {
    try {
      this.logger.log(
        `Creating Paymob unified intention payment for amount: ${request.amount.toString()} ${request.currency}`,
      );

      const amountInCents = Math.round(request.amount.toNumber() * 100);

      // Build billing data
      const billingData: any = {
        apartment: 'NA',
        floor: 'NA',
        street: 'NA',
        building: 'NA',
        shipping_method: 'NA',
        postal_code: 'NA',
        city: 'Cairo',
        country: 'EG',
        state: 'NA',
        email: request.customerEmail || 'gemater.g@gmail.com',
        phone_number: request.customerPhone || '+201000000000',
      };

      if (request.customerName) {
        const nameParts = request.customerName.split(' ');
        billingData.first_name = nameParts[0];
        billingData.last_name = nameParts.slice(1).join(' ') || 'Customer';
      } else {
        billingData.first_name =
          request.customerEmail?.split('@')[0] || 'Customer';
        billingData.last_name = 'Customer';
      }

      // Build customer object (separate from billing_data)
      const customer = {
        first_name: billingData.first_name,
        last_name: billingData.last_name,
        email: billingData.email,
        extras: request.metadata || {},
      };

      // Generate special reference (custom reference format)
      const specialReference = `payment-${request.orderId}-${Date.now()}`;

      // Build extras object for metadata
      const extras = {
        ...request.metadata,
        orderId: request.orderId,
      };

      // Collect all configured integration IDs
      const integrationIds: number[] = [];
      if (this.config.cardIntegrationId) {
        integrationIds.push(parseInt(this.config.cardIntegrationId));
      }
      if (this.config.walletIntegrationId) {
        integrationIds.push(parseInt(this.config.walletIntegrationId));
      }
      if (this.config.paypalIntegrationId) {
        integrationIds.push(parseInt(this.config.paypalIntegrationId));
      }
      console.log('integrationIds', integrationIds);

      // Single API call to unified intention endpoint
      // Uses Authorization header with Token prefix and secretKey
      const intentionResponse = await this.httpClient.post(
        '/v1/intention/',
        {
          amount: amountInCents, // Integer, not string
          currency: request.currency,
          payment_methods: integrationIds, // Array of all enabled integration IDs
          billing_data: billingData,
          items: [
            {
              name: request.description || 'Wallet Topup',
              amount: amountInCents, // Integer, not string
              description: request.description || 'Wallet Topup',
              quantity: 1, // Integer, not string
            },
          ],
          customer: customer,
          extras: extras,
          special_reference: specialReference,
          expiration: 3600, // 1 hour expiration
          notification_url: this.config.notificationUrl,
          redirection_url: this.config.redirectionUrl,
        },
        {
          headers: {
            Authorization: `Token ${this.config.secretKey}`, // Use Token prefix with secretKey
          },
        },
      );

      const clientSecret = intentionResponse.data.client_secret;
      const orderId =
        intentionResponse.data.order_id ||
        intentionResponse.data.id ||
        specialReference;

      if (!clientSecret) {
        throw new Error(
          'No client_secret received from Paymob unified intention API',
        );
      }

      // Return unified checkout URL
      // Users will select payment method (card, wallet, PayPal) on Paymob's page
      const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${this.config.publicKey}&clientSecret=${clientSecret}`;

      this.logger.log(`Paymob unified intention payment created: ${orderId}`);

      return {
        gatewayPaymentId: orderId.toString(),
        checkoutUrl,
        clientSecret: clientSecret,
        status: 'pending',
      };
    } catch (error) {
      // Extract Paymob-specific error details
      const paymobError = error.response?.data?.error || error.response?.data;
      const errorDetail =
        paymobError?.detail || paymobError?.message || error.message;
      const statusCode = error.response?.status;

      // Log the full Paymob response for debugging
      this.logger.error('Paymob Payment Error Detail', {
        fullResponse: error.response?.data,
        statusCode,
        headers: error.response?.headers,
      });

      const integrationIds = [
        this.config.cardIntegrationId,
        this.config.walletIntegrationId,
        this.config.paypalIntegrationId,
      ]
        .filter((id) => id)
        .join(', ');

      this.logger.error('Paymob unified intention payment creation failed', {
        orderId: request.orderId,
        amount: request.amount.toString(),
        statusCode,
        error: errorDetail,
        integrationIds,
      });

      // Categorize and provide specific error messages
      if (statusCode === 404 && errorDetail?.includes('Integration ID')) {
        throw new Error(
          `Paymob configuration error: Invalid Integration ID(s) (${integrationIds}). Please check your Paymob dashboard under Developers → Payment Integrations.`,
        );
      }

      if (statusCode === 401 || statusCode === 403) {
        throw new Error(
          `Paymob authentication failed: Invalid secret key. Please check your secret key in Paymob Settings → Account Info.`,
        );
      }

      if (
        errorDetail?.includes('billing_data') ||
        errorDetail?.includes('email')
      ) {
        throw new Error(
          `Paymob validation failed: Invalid customer information. Please check billing data format.`,
        );
      }

      throw new Error(`Paymob payment failed: ${errorDetail}`);
    }
  }

  async getPaymentStatus(
    gatewayPaymentId: string,
  ): Promise<PaymentStatusResponse> {
    try {
      this.logger.log(`Checking Paymob payment status: ${gatewayPaymentId}`);

      // Paymob doesn't have a direct "get payment status" API
      // We'll need to implement this through webhooks or by checking transaction details
      // For now, return a placeholder - this should be enhanced based on Paymob's API capabilities

      throw new Error('Payment status check not implemented for Paymob');
    } catch (error) {
      this.logger.error('Failed to get Paymob payment status', {
        gatewayPaymentId,
        error: error.message,
      });
      throw error;
    }
  }

  async refundPayment(
    request: RefundPaymentRequest,
  ): Promise<RefundPaymentResponse> {
    try {
      this.logger.log(
        `Processing Paymob refund: ${request.gatewayPaymentId}, amount: ${request.amount.toString()}`,
      );

      const amountInCents = Math.round(request.amount.toNumber() * 100);

      // Authenticate for refund
      const authResponse = await this.httpClient.post('/api/auth/tokens', {
        api_key: this.config.apiKey,
      });

      const authToken = authResponse.data.token;
      if (!authToken) {
        throw new Error('No token received from Paymob authentication');
      }

      // Use refund API
      const refundResponse = await this.httpClient.post(
        `/api/acceptance/transactions/${request.gatewayPaymentId}/refund`,
        {
          auth_token: authToken,
          amount_cents: amountInCents.toString(),
          reason: request.reason || 'Customer refund request',
        },
      );

      this.logger.log(
        `Paymob refund processed successfully: ${refundResponse.data.id}`,
      );

      return {
        gatewayRefundId: refundResponse.data.id,
        status: 'completed', // Assuming immediate completion
        amount: request.amount,
        processedAt: new Date(),
      };
    } catch (error) {
      // Extract Paymob-specific error details
      const paymobError = error.response?.data?.error || error.response?.data;
      const errorDetail =
        paymobError?.detail || paymobError?.message || error.message;
      const statusCode = error.response?.status;

      this.logger.error('Paymob refund failed', {
        gatewayPaymentId: request.gatewayPaymentId,
        amount: request.amount.toString(),
        statusCode,
        error: errorDetail,
      });

      // Categorize refund errors
      if (statusCode === 404) {
        throw new Error(
          `Paymob refund failed: Transaction not found (${request.gatewayPaymentId}). Transaction may not exist or be refundable.`,
        );
      }

      if (statusCode === 400 && errorDetail?.includes('amount')) {
        throw new Error(
          `Paymob refund failed: Invalid refund amount. Check if amount exceeds original transaction.`,
        );
      }

      throw new Error(`Paymob refund failed: ${errorDetail}`);
    }
  }

  validateWebhookSignature(payload: any, signature: string): boolean {
    try {
      if (!signature || !payload) {
        this.logger.warn('Missing HMAC signature or payload for validation');
        return false;
      }

      // Paymob webhooks contain transaction data in 'obj' field
      // Extract obj field (transaction data) for HMAC validation
      const obj = payload?.obj || payload;

      // Paymob calculates HMAC by concatenating specific fields in alphabetical order
      // Not just JSON.stringify of the entire payload
      const hmacFields = [
        'amount_cents',
        'created_at',
        'currency',
        'error_occured',
        'has_parent_transaction',
        'id',
        'integration_id',
        'is_3d_secure',
        'is_auth',
        'is_capture',
        'is_refunded',
        'is_standalone_payment',
        'is_voided',
        'order.id',
        'order.merchant.id',
        'owner',
        'pending',
        'source_data.pan',
        'source_data.sub_type',
        'source_data.type',
        'success',
      ];

      // Build HMAC string by concatenating field values in alphabetical order
      let hmacString = '';
      for (const field of hmacFields) {
        const value = this.getNestedValue(obj, field);
        if (value !== undefined && value !== null) {
          // Convert boolean values to lowercase strings ("true"/"false")
          let stringValue = value.toString();
          if (typeof value === 'boolean') {
            stringValue = value ? 'true' : 'false';
          }
          hmacString += stringValue;
        }
      }

      // Calculate expected signature using HMAC-SHA512 (not SHA256)
      const expectedSignature = crypto
        .createHmac('sha512', this.config.hmacSecret)
        .update(hmacString, 'utf8')
        .digest('hex')
        .toLowerCase(); // Ensure lowercase hex output

      // Normalize received signature to lowercase for comparison
      const normalizedSignature = signature.toLowerCase();

      // Use constant-time comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(normalizedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );

      if (!isValid) {
        this.logger.warn('Paymob webhook HMAC validation failed', {
          received: signature,
          expected: expectedSignature,
          hmacString: hmacString.substring(0, 100) + '...', // Log first 100 chars for debugging
        });
        return false;
      }

      this.logger.debug('Paymob webhook HMAC validation successful');
      return true;
    } catch (error) {
      this.logger.error('Paymob webhook signature validation error', {
        error: error.message,
        signature: signature ? 'present' : 'missing',
      });
      return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   * e.g., 'order.id' will return payload.order.id
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  async processWebhookEvent(
    event: WebhookEvent,
  ): Promise<PaymentStatusResponse> {
    try {
      this.logger.log(
        `Processing Paymob webhook: ${event.eventType} for payment ${event.gatewayPaymentId}`,
      );

      // Process different webhook event types
      switch (event.eventType) {
        case 'payment.completed':
        case 'TRANSACTION_COMPLETED':
          return {
            gatewayPaymentId: event.gatewayPaymentId,
            status: 'completed',
            amount: this.extractAmountFromWebhook(event.data),
            currency: this.extractCurrencyFromWebhook(event.data),
            paidAt: new Date(),
          };

        case 'payment.failed':
        case 'TRANSACTION_FAILED':
          return {
            gatewayPaymentId: event.gatewayPaymentId,
            status: 'failed',
            amount: this.extractAmountFromWebhook(event.data),
            currency: this.extractCurrencyFromWebhook(event.data),
            failureReason: event.data?.failure_reason || 'Payment failed',
          };

        case 'payment.cancelled':
        case 'TRANSACTION_CANCELLED':
          return {
            gatewayPaymentId: event.gatewayPaymentId,
            status: 'cancelled',
            amount: this.extractAmountFromWebhook(event.data),
            currency: this.extractCurrencyFromWebhook(event.data),
          };

        default:
          this.logger.warn(
            `Unknown Paymob webhook event type: ${event.eventType}`,
          );
          return {
            gatewayPaymentId: event.gatewayPaymentId,
            status: 'pending',
            amount: new Money(0),
            currency: 'EGP',
          };
      }
    } catch (error) {
      this.logger.error('Failed to process Paymob webhook event', {
        eventType: event.eventType,
        gatewayPaymentId: event.gatewayPaymentId,
        error: error.message,
      });
      throw error;
    }
  }

  supportsCurrency(currency: string): boolean {
    return this.supportedCurrencies.includes(currency.toUpperCase());
  }

  getSupportedCurrencies(): string[] {
    return [...this.supportedCurrencies];
  }

  private extractAmountFromWebhook(data: any): Money {
    // Paymob webhooks typically send amount in cents
    const amountInCents = data?.amount || data?.order?.amount || 0;
    return new Money(amountInCents / 100); // Convert cents to currency units
  }

  private extractCurrencyFromWebhook(data: any): string {
    return data?.currency || data?.order?.currency || 'EGP';
  }
}
