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
  PaymentGatewayMethod,
} from './interfaces/payment-gateway.interface';
import { Money } from '@/shared/common/utils/money.util';

@Injectable()
export class PaymobAdapter implements IPaymentGatewayAdapter {
  private readonly logger = new Logger(PaymobAdapter.name);
  private readonly httpClient: AxiosInstance;
  private readonly supportedCurrencies = ['EGP', 'USD'];
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private config: PaymentGatewayConfig) {
    // Validate configuration
    if (!config.cardIntegrationId || !config.walletIntegrationId) {
      throw new Error(
        'Paymob adapter requires cardIntegrationId and walletIntegrationId',
      );
    }

    // Initialize axios client for Paymob Legacy API
    this.httpClient = axios.create({
      baseURL: 'https://accept.paymob.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Format phone number for Paymob wallet payments
   * Paymob expects Egyptian numbers in format: 01xxxxxxxxx (without +20)
   */
  private formatPhoneForWallet(phone: string): string {
    if (!phone) return '';

    // Remove +20 prefix if present
    let formattedPhone = phone.replace(/^\+20/, '');

    // Ensure it starts with 01 (Egyptian mobile prefix)
    if (!formattedPhone.startsWith('01')) {
      // If it starts with just 1 (missing leading 0), add it
      if (formattedPhone.startsWith('1') && formattedPhone.length === 10) {
        formattedPhone = '0' + formattedPhone;
      }
    }

    // Validate format: should be 01xxxxxxxxx (11 digits total)
    if (!/^01\d{9}$/.test(formattedPhone)) {
      this.logger.warn(`Invalid phone format for wallet: ${formattedPhone}`);
    }

    return formattedPhone;
  }

  /**
   * Get the appropriate integration ID for the payment method
   */
  private getIntegrationId(methodType?: PaymentGatewayMethod): string {
    switch (methodType) {
      case PaymentGatewayMethod.CARD:
        return this.config.cardIntegrationId;
      case PaymentGatewayMethod.MOBILE_WALLET:
        return this.config.walletIntegrationId;
      case PaymentGatewayMethod.PAYPAL:
        return this.config.paypalIntegrationId || this.config.cardIntegrationId;
      default:
        // Fallback to legacy integrationId or card integration
        return this.config.integrationId || this.config.cardIntegrationId;
    }
  }

  /**
   * Create order with Paymob
   */
  private async createOrder(
    authToken: string,
    request: CreatePaymentRequest,
  ): Promise<string> {
    try {
      const amountInCents = Math.round(request.amount.toNumber() * 100);
      const amountCentsString = amountInCents.toString();

      // Paymob Legacy API requires very specific structure
      const orderPayload = {
        auth_token: authToken,
        delivery_needed: 'false',
        amount_cents: amountCentsString, // MUST BE A STRING
        currency: request.currency,
        merchant_order_id: request.orderId, // REQUIRED: Use our UUID to avoid duplicates
        items: [
          {
            name: request.description || 'Wallet Topup',
            amount_cents: amountCentsString, // MUST BE A STRING
            description: request.description || 'Wallet Topup',
            quantity: '1', // MUST BE A STRING
          },
        ],
      };

      const orderResponse = await this.httpClient.post(
        '/api/ecommerce/orders', // No trailing slash
        orderPayload,
      );

      return orderResponse.data.id;
    } catch (error) {
      this.logger.error('Paymob order creation failed', {
        fullResponse: error.response?.data,
        statusCode: error.response?.status,
        requestAmount: request.amount.toString(),
        merchantOrderId: request.orderId,
      });
      throw error;
    }
  }

  /**
   * Generate payment key for the order
   */
  private async generatePaymentKey(
    authToken: string,
    orderId: string,
    request: CreatePaymentRequest,
  ): Promise<string> {
    try {
      const amountInCents = Math.round(request.amount.toNumber() * 100);
      const amountCentsString = amountInCents.toString();
      const integrationId = this.getIntegrationId(request.methodType);

      const paymentKeyPayload = {
        auth_token: authToken,
        amount_cents: amountCentsString, // MUST BE A STRING
        expiration: 3600, // 1 hour
        order_id: orderId,
        billing_data: {
          first_name: request.customerName?.split(' ')[0] || 'Customer',
          last_name:
            request.customerName?.split(' ').slice(1).join(' ') || 'User',
          email: request.customerEmail || 'customer@placeholder.local',
          phone_number: request.customerPhone || '',
          apartment: 'NA',
          floor: 'NA',
          street: 'NA',
          building: 'NA',
          shipping_method: 'NA',
          postal_code: 'NA',
          city: 'Cairo',
          country: 'EG',
          state: 'NA',
        },
        currency: request.currency,
        integration_id: parseInt(integrationId),
      };

      const paymentKeyResponse = await this.httpClient.post(
        '/api/acceptance/payment_keys',
        paymentKeyPayload,
      );

      return paymentKeyResponse.data.token;
    } catch (error) {
      this.logger.error('Paymob payment key creation failed', {
        fullResponse: error.response?.data,
        statusCode: error.response?.status,
        orderId,
        integrationId: this.getIntegrationId(request.methodType),
      });
      throw error;
    }
  }

  /**
   * Authenticate with Paymob and get temporary token
   */
  private async authenticate(): Promise<string | null> {
    // Check if we have a valid token
    if (this.authToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.authToken;
    }

    try {
      const response = await this.httpClient.post('/api/auth/tokens', {
        api_key: this.config.apiKey, // Use API Key for authentication (not Secret Key)
      });

      const token = response.data.token;
      if (!token) {
        throw new Error('No token received from Paymob authentication');
      }

      this.authToken = token;
      // Paymob tokens are valid for 1 hour (3600 seconds)
      this.tokenExpiry = new Date(Date.now() + 3600 * 1000);

      return this.authToken;
    } catch (error) {
      this.logger.error(
        'Paymob authentication failed',
        error.response?.data || error.message,
      );
      throw new Error('Failed to authenticate with Paymob');
    }
  }

  getName(): string {
    return 'paymob';
  }

  async createPayment(
    request: CreatePaymentRequest,
  ): Promise<CreatePaymentResponse> {
    try {
      this.logger.log(
        `Creating Paymob payment for amount: ${request.amount.toString()} ${request.currency}, method: ${request.methodType || 'CARD'}`,
      );

      // Step 1: Get authentication token
      const authToken = await this.authenticate();
      if (!authToken) {
        throw new Error('Failed to authenticate with Paymob');
      }

      // Step 2: Register order
      const orderId = await this.createOrder(authToken, request);

      // Step 3: Generate payment key
      const paymentToken = await this.generatePaymentKey(
        authToken,
        orderId,
        request,
      );

      // Step 4: Handle different payment methods
      let checkoutUrl: string;

      if (request.methodType === PaymentGatewayMethod.MOBILE_WALLET) {
        // Mobile Wallet: Make additional API call to get wallet redirection URL

        // Format phone number for Paymob wallet requirements
        const formattedPhone = this.formatPhoneForWallet(
          request.customerPhone || '',
        );

        const walletResponse = await this.httpClient.post(
          '/api/acceptance/payments/pay',
          {
            source: {
              identifier: formattedPhone, // Properly formatted phone number
              subtype: 'WALLET',
            },
            payment_token: paymentToken,
          },
        );

        // Check if wallet response contains redirection URL
        if (!walletResponse.data?.redirection_url) {
          const errorMsg =
            walletResponse.data?.error ||
            'No redirection URL provided by wallet service';
          this.logger.error('Wallet payment failed: no redirection URL', {
            response: walletResponse.data,
            phone: formattedPhone,
          });
          throw new Error(`Wallet payment failed: ${errorMsg}`);
        }

        checkoutUrl = walletResponse.data.redirection_url;
      } else if (request.methodType === PaymentGatewayMethod.PAYPAL) {
        // PayPal: Make additional API call to get PayPal redirection URL
        const paypalResponse = await this.httpClient.post(
          '/api/acceptance/payments/pay',
          {
            source: {
              identifier: 'paypal',
              subtype: 'PAYPAL',
            },
            payment_token: paymentToken,
          },
        );

        // Check if PayPal response contains redirection URL
        if (!paypalResponse.data?.redirection_url) {
          const errorMsg =
            paypalResponse.data?.error ||
            'No redirection URL provided by PayPal service';
          this.logger.error('PayPal payment failed: no redirection URL', {
            response: paypalResponse.data,
          });
          throw new Error(`PayPal payment failed: ${errorMsg}`);
        }

        checkoutUrl = paypalResponse.data.redirection_url;
      } else {
        // Credit Card: Use iframe URL
        if (!this.config.iframeId) {
          throw new Error(
            'Paymob iframe ID is required for credit card payments. Please set PAYMOB_IFRAME_ID environment variable.',
          );
        }
        checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/${this.config.iframeId}?payment_token=${paymentToken}`;
      }

      this.logger.log(
        `Paymob payment created: ${orderId}, method: ${request.methodType || 'CARD'}`,
      );

      return {
        gatewayPaymentId: orderId.toString(),
        checkoutUrl,
        clientSecret: paymentToken,
        status: 'pending',
      };
    } catch (error) {
      // Extract Paymob-specific error details
      const paymobError = error.response?.data?.error || error.response?.data;
      const errorDetail =
        paymobError?.detail || paymobError?.message || error.message;
      const statusCode = error.response?.status;

      // Log the full Paymob response for debugging
      this.logger.error('Paymob Order Error Detail', {
        fullResponse: error.response?.data,
        statusCode,
        headers: error.response?.headers,
      });

      this.logger.error('Paymob payment creation failed', {
        orderId: request.orderId,
        amount: request.amount.toString(),
        methodType: request.methodType || 'CARD',
        statusCode,
        error: errorDetail,
        integrationId: this.getIntegrationId(request.methodType),
      });

      // Categorize and provide specific error messages
      if (statusCode === 404 && errorDetail?.includes('Integration ID')) {
        throw new Error(
          `Paymob configuration error: Invalid Integration ID (${this.config.integrationId}). Please check your Paymob dashboard under Developers → Payment Integrations.`,
        );
      }

      if (statusCode === 401 || statusCode === 403) {
        throw new Error(
          `Paymob authentication failed: Invalid API key. Please check your API key in Paymob Settings → Account Info.`,
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

      // Get authentication token for refund
      const authToken = await this.authenticate();

      // Use legacy API for refunds
      const refundResponse = await this.httpClient.post(
        `/api/acceptance/transactions/${request.gatewayPaymentId}/refund`,
        {
          auth_token: authToken,
          amount_cents: amountInCents.toString(), // MUST BE A STRING
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

      // Paymob Legacy API (v2 webhooks) calculates HMAC by concatenating specific fields in alphabetical order
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
        const value = this.getNestedValue(payload, field);
        if (value !== undefined && value !== null) {
          hmacString += value.toString();
        }
      }

      // Calculate expected signature using HMAC-SHA256
      const expectedSignature = crypto
        .createHmac('sha256', this.config.hmacSecret)
        .update(hmacString, 'utf8')
        .digest('hex');

      // Use constant-time comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
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
