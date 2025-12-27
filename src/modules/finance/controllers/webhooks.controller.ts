import {
  Controller,
  Post,
  Body,
  Headers,
  Query,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { WebhookService } from '../services/webhook.service';
import { PaymobWebhookPayload } from '../dto/webhook-payload.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiTags('Webhooks')
@Controller('finance/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('paymob')
  @ApiOperation({
    summary: 'Paymob webhook endpoint',
    description: 'Handles incoming webhooks from Paymob payment provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook payload or HMAC signature',
  })
  async handlePaymobWebhook(
    @Body() payload: PaymobWebhookPayload,
    @Query('hmac') hmac: string,
    @Headers() headers: Record<string, string>,
  ): Promise<ControllerResponse<any>> {
    try {
      const ipAddress =
        headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';

      // Use transaction ID as external ID for idempotency
      const externalId =
        payload.id ||
        payload.transaction_id ||
        payload.obj?.id ||
        `paymob-${Date.now()}`;

      const result = await this.webhookService.processWebhook(
        'PAYMOB' as any,
        externalId,
        payload,
        hmac || '',
        ipAddress,
      );

      return {
        data: {
          processed: true,
          attemptId: result.id,
          status: result.status,
        },
        message: {
          key: 't.messages.success',
          args: {},
        },
      };
    } catch (error) {
      this.logger.error('Paymob webhook processing failed', error);

      // Return 200 to prevent Paymob from retrying (idempotent)
      return {
        data: {
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        message: {
          key: 't.messages.error',
          args: {},
        },
      };
    }
  }
}
