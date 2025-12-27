import { Injectable, Logger } from '@nestjs/common';
import { Config } from '@/shared/config/config';
import {
  IPaymentGatewayAdapter,
  PaymentGatewayConfig,
  PaymentGatewayType,
} from './interfaces/payment-gateway.interface';
import { PaymobAdapter } from './paymob.adapter';

@Injectable()
export class PaymentGatewayFactory {
  private readonly logger = new Logger(PaymentGatewayFactory.name);
  private readonly gateways = new Map<
    PaymentGatewayType,
    IPaymentGatewayAdapter
  >();

  constructor() {
    this.initializeGateways();
  }

  getGateway(type?: PaymentGatewayType): IPaymentGatewayAdapter {
    const gatewayType = type || this.getDefaultGatewayType();
    const gateway = this.gateways.get(gatewayType);

    if (!gateway) {
      throw new Error(`Payment gateway '${gatewayType}' not configured`);
    }

    return gateway;
  }

  getAvailableGateways(): PaymentGatewayType[] {
    return Array.from(this.gateways.keys());
  }

  private getDefaultGatewayType(): PaymentGatewayType {
    const configuredType = Config.payment.gatewayType?.toLowerCase();

    if (configuredType === 'paymob') {
      return PaymentGatewayType.PAYMOB;
    }

    this.logger.warn(`Unknown gateway type '${configuredType}', using Paymob`);
    return PaymentGatewayType.PAYMOB;
  }

  private initializeGateways(): void {
    // Initialize Paymob
    const paymobConfig = this.createPaymobConfig();
    if (paymobConfig) {
      this.gateways.set(
        PaymentGatewayType.PAYMOB,
        new PaymobAdapter(paymobConfig),
      );
      this.logger.log('Paymob gateway initialized');
    } else {
      this.logger.error('Paymob gateway configuration incomplete');
    }

    // Future gateways can be added here
    // this.initializeStripeGateway();
    // this.initializePayPalGateway();
  }

  private createPaymobConfig(): PaymentGatewayConfig | null {
    const paymob = Config.payment.paymob;

    // Required fields validation
    const requiredFields = {
      apiKey: paymob.apiKey,
      publicKey: paymob.publicKey,
      secretKey: paymob.secretKey,
      hmacSecret: paymob.hmacSecret,
      cardIntegrationId: paymob.cardIntegrationId,
      walletIntegrationId: paymob.walletIntegrationId,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      this.logger.error(`Paymob config missing: ${missingFields.join(', ')}`);
      this.logger.error(
        'Set PAYMOB_API_KEY, PAYMOB_PUBLIC_KEY, PAYMOB_SECRET_KEY, PAYMOB_HMAC_SECRET, PAYMOB_CARD_INTEGRATION_ID, PAYMOB_WALLET_INTEGRATION_ID',
      );
      return null;
    }

    return {
      apiKey: paymob.apiKey,
      publicKey: paymob.publicKey,
      secretKey: paymob.secretKey,
      hmacSecret: paymob.hmacSecret,
      cardIntegrationId: paymob.cardIntegrationId,
      walletIntegrationId: paymob.walletIntegrationId,
      paypalIntegrationId: paymob.paypalIntegrationId,
      iframeId: paymob.iframeId,
      integrationId: paymob.cardIntegrationId, // Legacy compatibility
      notificationUrl:
        paymob.notificationUrl ||
        `${Config.app.baseUrl}/api/v1/finance/webhooks/paymob`,
      redirectionUrl:
        paymob.redirectionUrl ||
        `${Config.app.baseUrl}/api/v1/finance/payments/success`,
      testMode: paymob.testMode,
    };
  }
}
