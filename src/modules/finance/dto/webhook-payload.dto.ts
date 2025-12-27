import { IsString, IsObject, IsOptional } from 'class-validator';

// Generic webhook payload interface
export class WebhookPayloadDto {
  @IsString()
  id: string; // Webhook event ID

  @IsString()
  type: string; // Event type

  @IsObject()
  data: any; // Event data

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// Provider-specific webhook DTOs
export class PaymobWebhookPayload extends WebhookPayloadDto {
  // Paymob specific fields
  @IsOptional()
  @IsString()
  obj?: any; // The transaction object

  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsObject()
  billing_data?: any;

  @IsOptional()
  @IsObject()
  payment_key_claims?: any;
}
