import { Injectable, Logger, Inject } from '@nestjs/common';
import { PaymentGatewayFactory } from './payment-gateway.factory';
import { PaymentGatewayType } from './interfaces/payment-gateway.interface';
import { Money } from '@/shared/common/utils/money.util';

export { PaymentGatewayType };
import {
  IPaymentGatewayAdapter,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatusResponse,
  RefundPaymentRequest,
  RefundPaymentResponse,
  WebhookEvent,
} from './interfaces/payment-gateway.interface';
import { PaymentGatewayCircuitBreaker } from '../circuit-breaker/payment-gateway-circuit-breaker';
import { FinanceMonitorService } from '../monitoring/finance-monitor.service';

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly circuitBreaker: PaymentGatewayCircuitBreaker,
    @Inject(FinanceMonitorService)
    private readonly financeMonitor: FinanceMonitorService,
  ) {}

  /**
   * Get the active payment gateway adapter
   */
  private getGateway(type?: PaymentGatewayType): IPaymentGatewayAdapter {
    return this.gatewayFactory.getGateway(type);
  }

  /**
   * Create a payment using the configured gateway with circuit breaker protection
   */
  async createPayment(
    request: CreatePaymentRequest,
    gatewayType?: PaymentGatewayType,
  ): Promise<CreatePaymentResponse> {
    const gateway = this.getGateway(gatewayType);
    const gatewayName = gateway.getName();

    this.logger.log(
      `Creating payment via ${gatewayName}: ${request.amount.toString()} ${request.currency}`,
    );

    // Record payment creation attempt
    this.financeMonitor.recordPaymentCreated(
      request.amount,
      gatewayName,
      'initiate_payment',
    );

    try {
      // Check circuit breaker state
      if (this.circuitBreaker.isOpen(gatewayName)) {
        this.financeMonitor.recordPaymentFailed(
          'circuit_breaker_open',
          'circuit_breaker',
        );
        throw new Error(
          `Payment gateway ${gatewayName} is currently unavailable`,
        );
      }

      // Execute payment creation through circuit breaker
      const result = await this.circuitBreaker.execute(
        () => gateway.createPayment(request),
        gatewayName,
      );

      this.financeMonitor.recordPaymentCompleted(
        request.amount,
        gatewayName,
        'external_payment',
      );
      this.logger.log(
        `Payment created successfully via ${gatewayName}: ${result.gatewayPaymentId}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Payment creation failed via ${gatewayName}`, {
        orderId: request.orderId,
        amount: request.amount.toString(),
        error: error.message,
      });

      this.financeMonitor.recordPaymentFailed(error.message, 'gateway_error');
      throw error;
    }
  }

  /**
   * Get payment status with circuit breaker protection
   */
  async getPaymentStatus(
    gatewayPaymentId: string,
    gatewayType?: PaymentGatewayType,
  ): Promise<PaymentStatusResponse> {
    // Handle TEST method - simulate successful payment status
    if (gatewayPaymentId.startsWith('test_')) {
      this.logger.log(
        `TEST: Simulating payment status check: ${gatewayPaymentId} - COMPLETED`,
      );

      return {
        gatewayPaymentId,
        status: 'completed',
        amount: Money.from(0), // Mock amount for testing
        currency: 'EGP', // Default currency
        paidAt: new Date(),
      };
    }

    const gateway = this.getGateway(gatewayType);
    const gatewayName = gateway.getName();

    this.logger.log(
      `Checking payment status via ${gatewayName}: ${gatewayPaymentId}`,
    );

    try {
      // Check circuit breaker state
      if (this.circuitBreaker.isOpen(gatewayName)) {
        throw new Error(
          `Payment gateway ${gatewayName} is currently unavailable`,
        );
      }

      // Execute status check through circuit breaker
      const result = await this.circuitBreaker.execute(
        () => gateway.getPaymentStatus(gatewayPaymentId),
        gatewayName,
      );

      this.logger.log(
        `Payment status retrieved: ${gatewayPaymentId} - ${result.status}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to get payment status via ${gatewayName}`, {
        gatewayPaymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process a refund with circuit breaker protection
   */
  async refundPayment(
    request: RefundPaymentRequest,
    gatewayType?: PaymentGatewayType,
  ): Promise<RefundPaymentResponse> {
    const gateway = this.getGateway(gatewayType);
    const gatewayName = gateway.getName();

    this.logger.log(
      `Processing refund via ${gatewayName}: ${request.gatewayPaymentId}, amount: ${request.amount.toString()}`,
    );

    try {
      // Check circuit breaker state
      if (this.circuitBreaker.isOpen(gatewayName)) {
        throw new Error(
          `Payment gateway ${gatewayName} is currently unavailable`,
        );
      }

      // Execute refund through circuit breaker
      const result = await this.circuitBreaker.execute(
        () => gateway.refundPayment(request),
        gatewayName,
      );

      this.logger.log(
        `Refund processed successfully via ${gatewayName}: ${result.gatewayRefundId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Refund failed via ${gatewayName}`, {
        gatewayPaymentId: request.gatewayPaymentId,
        amount: request.amount.toString(),
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(
    gatewayType: PaymentGatewayType,
    payload: any,
    signature: string,
  ): boolean {
    try {
      const gateway = this.getGateway(gatewayType);
      return gateway.validateWebhookSignature(payload, signature);
    } catch (error) {
      this.logger.error(
        `Webhook signature validation failed for ${gatewayType}`,
        {
          error: error.message,
        },
      );
      return false;
    }
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(
    gatewayType: PaymentGatewayType,
    event: WebhookEvent,
  ): Promise<PaymentStatusResponse> {
    const gateway = this.getGateway(gatewayType);
    const gatewayName = gateway.getName();

    this.logger.log(
      `Processing webhook event via ${gatewayName}: ${event.eventType}`,
    );

    try {
      const result = await gateway.processWebhookEvent(event);

      this.logger.log(
        `Webhook processed successfully: ${event.gatewayPaymentId} - ${result.status}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Webhook processing failed for ${gatewayName}`, {
        eventType: event.eventType,
        gatewayPaymentId: event.gatewayPaymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if gateway supports currency
   */
  supportsCurrency(
    currency: string,
    gatewayType?: PaymentGatewayType,
  ): boolean {
    const gateway = this.getGateway(gatewayType);
    return gateway.supportsCurrency(currency);
  }

  /**
   * Get supported currencies for gateway
   */
  getSupportedCurrencies(gatewayType?: PaymentGatewayType): string[] {
    const gateway = this.getGateway(gatewayType);
    return gateway.getSupportedCurrencies();
  }

  /**
   * Get available gateway types
   */
  getAvailableGateways(): PaymentGatewayType[] {
    return this.gatewayFactory.getAvailableGateways();
  }
}
