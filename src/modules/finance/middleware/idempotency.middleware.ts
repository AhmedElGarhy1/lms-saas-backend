import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WebhookAttemptRepository } from '../repositories/webhook-attempt.repository';
import { WebhookProvider } from '../enums/webhook-provider.enum';
import { WebhookStatus } from '../enums/webhook-status.enum';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IdempotencyMiddleware.name);

  constructor(
    private readonly webhookAttemptRepository: WebhookAttemptRepository,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = this.getProviderFromPath(req.path);
      const externalId = this.extractExternalId(provider, req.body);

      if (!externalId) {
        this.logger.warn('Could not extract external ID from webhook payload');
        // Continue processing - let the main handler deal with invalid payloads
        return next();
      }

      // Fast idempotency check - before expensive signature verification
      const existingAttempt = await this.webhookAttemptRepository.findByProviderAndExternalId(
        provider,
        externalId,
      );

      if (existingAttempt) {
        if (existingAttempt.status === WebhookStatus.PROCESSED) {
          // Idempotent response - webhook already processed
          this.logger.log(`Idempotent webhook detected: ${provider}:${externalId}`);

          res.status(200).json({
            success: true,
            message: 'Webhook already processed',
            idempotent: true,
          });
          return;
        }

        // If it's failed or retrying, we'll reprocess it
        if (existingAttempt.status === WebhookStatus.FAILED ||
            existingAttempt.status === WebhookStatus.RETRY_SCHEDULED) {
          this.logger.log(`Retrying failed webhook: ${provider}:${externalId}`);
          // Continue to processing
        }
      }

      // Add idempotency info to request for later use
      (req as any).webhookIdempotency = {
        provider,
        externalId,
        existingAttempt,
      };

      next();
    } catch (error) {
      this.logger.error('Idempotency middleware error', error);
      // Don't block processing for middleware errors
      next();
    }
  }

  private getProviderFromPath(path: string): WebhookProvider {
    if (path.includes('/paymob')) {
      return WebhookProvider.PAYMOB;
    }
    throw new Error('Unknown webhook provider');
  }

  private extractExternalId(provider: WebhookProvider, payload: any): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    try {
      switch (provider) {
        case WebhookProvider.PAYMOB:
          // Extract transaction ID from Paymob webhook
          return payload.id || payload.transaction_id || payload.obj?.id;

        default:
          return null;
      }
    } catch (error) {
      this.logger.warn('Failed to extract external ID from webhook payload', error);
      return null;
    }
  }
}
