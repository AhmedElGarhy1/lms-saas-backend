import {
  IsString,
  IsObject,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

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

// Paymob transaction object structure (from obj field)
export interface PaymobTransactionObj {
  id?: string;
  success?: boolean;
  amount_cents?: number;
  created_at?: string;
  currency?: string;
  error_occured?: boolean;
  has_parent_transaction?: boolean;
  integration_id?: number;
  is_3d_secure?: boolean;
  is_auth?: boolean;
  is_capture?: boolean;
  is_refunded?: boolean;
  is_standalone_payment?: boolean;
  is_voided?: boolean;
  owner?: number;
  pending?: boolean;
  source_data?: {
    pan?: string;
    sub_type?: string;
    type?: string;
  };
  order?: {
    id?: string;
    merchant_order_id?: string;
    merchant?: {
      id?: string;
    };
  };
  special_reference?: string;
  payment_key_claims?: {
    extra?: {
      bookingId?: number;
      orderId?: string;
      [key: string]: any;
    };
  };
  [key: string]: any; // Allow additional fields
}

// Provider-specific webhook DTOs
export class PaymobWebhookPayload extends WebhookPayloadDto {
  // Paymob webhooks contain transaction data in 'obj' field
  @IsOptional()
  @IsObject()
  obj?: PaymobTransactionObj; // The transaction object (primary data source)

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
