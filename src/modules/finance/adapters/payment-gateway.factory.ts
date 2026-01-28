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

    // Required fields validation for unified intention API
    const requiredFields = {
      apiKey: paymob.apiKey,
      publicKey: paymob.publicKey,
      secretKey: paymob.secretKey,
      hmacSecret: paymob.hmacSecret,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      this.logger.error(`Paymob config missing: ${missingFields.join(', ')}`);
      this.logger.error(
        'Set PAYMOB_API_KEY, PAYMOB_PUBLIC_KEY, PAYMOB_SECRET_KEY, PAYMOB_HMAC_SECRET',
      );
      return null;
    }

    // Validate at least one integration ID is configured
    const integrationIds = [
      paymob.cardIntegrationId,
      paymob.walletIntegrationId,
      paymob.paypalIntegrationId,
      paymob.kioskIntegrationId,
    ].filter((id) => id && id.trim() !== '');

    if (integrationIds.length === 0) {
      this.logger.error(
        'Paymob config missing: At least one integration ID is required',
      );
      this.logger.error(
        'Set at least one of: PAYMOB_CARD_INTEGRATION_ID, PAYMOB_WALLET_INTEGRATION_ID, PAYMOB_PAYPAL_INTEGRATION_ID, PAYMOB_KIOSK_INTEGRATION_ID',
      );
      return null;
    }

    const enabledMethods = [];
    if (paymob.cardIntegrationId) enabledMethods.push('card');
    if (paymob.walletIntegrationId) enabledMethods.push('wallet');
    if (paymob.paypalIntegrationId) enabledMethods.push('PayPal');
    if (paymob.kioskIntegrationId) enabledMethods.push('kiosk');

    this.logger.log(
      `Using Paymob unified intention API with payment methods: ${enabledMethods.join(', ')}`,
    );

    return {
      apiKey: paymob.apiKey,
      publicKey: paymob.publicKey,
      secretKey: paymob.secretKey,
      hmacSecret: paymob.hmacSecret,
      cardIntegrationId: paymob.cardIntegrationId || undefined,
      walletIntegrationId: paymob.walletIntegrationId || undefined,
      paypalIntegrationId: paymob.paypalIntegrationId || undefined,
      notificationUrl:
        paymob.notificationUrl ||
        `${Config.app.baseUrl}/api/v1/finance/webhooks/paymob`,
      redirectionUrl:
        paymob.redirectionUrl || Config.app.frontendUrl, // Redirect directly to frontend
      testMode: paymob.testMode,
    };
  }
}
