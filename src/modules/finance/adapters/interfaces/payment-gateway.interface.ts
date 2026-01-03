import { Money } from '@/shared/common/utils/money.util';

export enum PaymentGatewayType {
  PAYMOB = 'paymob',
  // Future gateways can be added here
  // STRIPE = 'stripe',
  // PAYPAL = 'paypal',
}

export enum PaymentGatewayMethod {
  CARD = 'CARD',
  MOBILE_WALLET = 'MOBILE_WALLET',
  PAYPAL = 'PAYPAL',
  TEST = 'TEST', // For testing purposes - simulates payment without calling gateway
}

export interface PaymentGatewayConfig {
  apiKey: string;
  publicKey: string;
  secretKey: string; // API Secret Key
  hmacSecret: string; // HMAC Secret for webhook validation

  // Paymob integration IDs for different payment methods
  cardIntegrationId: string; // For credit cards
  walletIntegrationId: string; // For mobile wallets (Vodafone Cash, etc.)
  paypalIntegrationId?: string; // For PayPal (optional)

  // Iframe ID for hosted checkout
  iframeId?: string; // For credit card iframe

  // Legacy field for backward compatibility
  integrationId?: string;

  notificationUrl: string;
  redirectionUrl: string;
  testMode?: boolean;
}

export interface CreatePaymentRequest {
  amount: Money;
  currency: string;
  orderId: string;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  description?: string;
  methodType?: PaymentGatewayMethod; // Payment gateway method
  metadata?: Record<string, any>;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreatePaymentResponse {
  gatewayPaymentId: string;
  checkoutUrl: string;
  clientSecret?: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface PaymentStatusResponse {
  gatewayPaymentId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  amount: Money;
  currency: string;
  paidAt?: Date;
  failureReason?: string;
}

export interface RefundPaymentRequest {
  gatewayPaymentId: string;
  amount: Money;
  reason?: string;
}

export interface RefundPaymentResponse {
  gatewayRefundId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: Money;
  processedAt?: Date;
}

export interface WebhookEvent {
  eventType: string;
  gatewayPaymentId: string;
  data: any;
  signature?: string;
  timestamp: Date;
}

export interface IPaymentGatewayAdapter {
  /**
   * Get the name of the payment gateway
   */
  getName(): string;

  /**
   * Create a payment intention and get checkout URL
   */
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>;

  /**
   * Get payment status
   */
  getPaymentStatus(gatewayPaymentId: string): Promise<PaymentStatusResponse>;

  /**
   * Process a refund
   */
  refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResponse>;

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: any, signature: string): boolean;

  /**
   * Process webhook event
   */
  processWebhookEvent(event: WebhookEvent): Promise<PaymentStatusResponse>;

  /**
   * Check if the gateway supports a specific currency
   */
  supportsCurrency(currency: string): boolean;

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[];
}
