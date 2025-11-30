import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
  Req,
} from '@nestjs/common';
import {
  AuthenticationFailedException,
  ValidationFailedException,
} from '@/shared/common/exceptions/custom.exceptions';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '@/shared/common/decorators/public.decorator';
import { RateLimit } from '@/modules/rate-limit/decorators/rate-limit.decorator';
import { Config } from '@/shared/config/config';
import {
  WhatsAppWebhookVerificationDto,
  WhatsAppWebhookEventDto,
} from '../dto/whatsapp-webhook.dto';
import { WhatsAppWebhookService } from '../services/webhooks/whatsapp-webhook.service';
import { WhatsAppWebhookSignatureService } from '../services/webhooks/whatsapp-webhook-signature.service';
import { WhatsAppWebhookEvent } from '../types/whatsapp-webhook.types';

/**
 * Extended Request interface with rawBody for signature verification
 */
interface RequestWithRawBody extends Request {
  rawBody?: string;
}

/**
 * Controller for Meta WhatsApp webhook endpoints
 * Handles webhook verification (GET) and event processing (POST)
 */
@ApiTags('WhatsApp Webhooks')
@Controller('notifications/webhooks/whatsapp')
@Public() // Public endpoint (no auth, but signature verified)
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly webhookService: WhatsAppWebhookService,
    private readonly signatureService: WhatsAppWebhookSignatureService,
  ) {}

  /**
   * Webhook verification endpoint (GET)
   * Meta sends GET request during webhook setup to verify endpoint
   */
  @Get()
  @ApiExcludeEndpoint() // Hide from Swagger (internal endpoint)
  @ApiOperation({ summary: 'WhatsApp webhook verification' })
  verifyWebhook(
    @Query() query: WhatsAppWebhookVerificationDto,
    @Res() res: Response,
  ): void {
    const {
      'hub.mode': mode,
      'hub.verify_token': token,
      'hub.challenge': challenge,
    } = query;

    this.logger.debug(`Webhook verification attempt: mode=${mode}`);

    // Verify mode is "subscribe"
    if (mode !== 'subscribe') {
      this.logger.warn(`Invalid webhook mode: ${mode}`);
      res.status(HttpStatus.FORBIDDEN).send('Invalid mode');
      return;
    }

    // Verify token matches configured token
    const expectedToken = Config.whatsapp.webhookVerifyToken;
    if (!expectedToken || token !== expectedToken) {
      this.logger.warn('Webhook verification failed: invalid token');
      res.status(HttpStatus.FORBIDDEN).send('Invalid token');
      return;
    }

    // Return challenge to complete verification
    this.logger.log('Webhook verification successful');
    res.status(HttpStatus.OK).send(challenge);
  }

  /**
   * Webhook event endpoint (POST)
   * Receives webhook events from Meta and processes them asynchronously
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 100, windowSeconds: 60 }) // Protect from floods
  @ApiExcludeEndpoint() // Hide from Swagger (internal endpoint)
  @ApiOperation({ summary: 'WhatsApp webhook events' })
  async handleWebhook(
    @Req() req: RequestWithRawBody,
    @Body() body: WhatsAppWebhookEventDto,
  ): Promise<{ success: boolean }> {
    const startTime = Date.now();

    try {
      // Get raw body from middleware (preserved before JSON parsing)
      const rawBody: string = req.rawBody || JSON.stringify(body);
      const signature = req.headers['x-hub-signature-256'] as
        | string
        | undefined;

      // Verify signature
      const isValid = this.signatureService.verifySignature(rawBody, signature);
      if (!isValid) {
        this.logger.warn('Webhook signature verification failed');
        throw new AuthenticationFailedException('t.errors.invalid.generic', {
          field: 't.common.resources.signature',
        });
      }

      // Enqueue webhook event for async processing
      const event: WhatsAppWebhookEvent =
        body as unknown as WhatsAppWebhookEvent;
      await this.webhookService.enqueueWebhookEvent(event);

      // Log webhook receipt (sanitized in production)
      if (Config.app.nodeEnv === 'development') {
        this.logger.debug(`Webhook event received: ${JSON.stringify(event)}`);
      } else {
        // In production, only log essential info
        const statusCount = event.entry
          .flatMap((e) => e.changes)
          .reduce(
            (count, change) => count + (change.value.statuses?.length || 0),
            0,
          );
        this.logger.log(
          `Webhook event received: ${event.entry.length} entries, ${statusCount} status updates`,
        );
      }

      // Return 200 immediately to acknowledge receipt
      return { success: true };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error(
        `Failed to handle webhook event (${latency}ms)`,
        error instanceof Error ? error.stack : String(error),
      );

      // Re-throw to return appropriate HTTP status
      if (error instanceof AuthenticationFailedException) {
        throw error;
      }
      if (error instanceof ValidationFailedException) {
        throw error;
      }

      // For other errors, return 500 but log details
      throw error;
    }
  }
}
