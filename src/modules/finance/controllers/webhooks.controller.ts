import {
  Controller,
  Post,
  Body,
  Headers,
  Query,
  Logger,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookService } from '../services/webhook.service';
import { PaymobWebhookPayload } from '../dto/webhook-payload.dto';
import { WebhookProvider } from '../enums/webhook-provider.enum';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { Public } from '@/shared/common/decorators';

@ApiTags('Webhooks')
@Controller('finance/webhooks')
@Public()
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

      // Paymob webhooks contain transaction data in 'obj' field
      // Prioritize extracting transaction ID from obj field
      const obj = payload?.obj || payload;
      const externalId = obj?.id || payload.id || payload.transaction_id;

      // Validate transaction ID exists (required for idempotency)
      if (!externalId) {
        this.logger.error('Paymob webhook missing transaction ID', {
          payload: JSON.stringify(payload).substring(0, 500), // Log first 500 chars
        });
        // Return 200 to prevent Paymob from retrying invalid webhooks
        return ControllerResponse.success({
          processed: false,
          error: 'Missing transaction ID',
        });
      }

      const result = await this.webhookService.processWebhook(
        WebhookProvider.PAYMOB,
        externalId,
        payload, // Full payload (validation will extract obj field)
        hmac || '',
        ipAddress,
      );

      return ControllerResponse.success(null);
    } catch (error) {
      this.logger.error('Paymob webhook processing failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Always return 200 to prevent Paymob from retrying
      // Paymob will automatically retry failed callbacks up to 15 times
      // Our idempotency handling will prevent duplicate processing
      return ControllerResponse.success({
        processed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
