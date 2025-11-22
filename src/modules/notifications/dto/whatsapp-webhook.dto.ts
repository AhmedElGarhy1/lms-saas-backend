import {
  IsString,
  IsArray,
  ValidateNested,
  IsObject,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for webhook verification (GET request)
 */
export class WhatsAppWebhookVerificationDto {
  @IsString()
  'hub.mode': string;

  @IsString()
  'hub.verify_token': string;

  @IsString()
  'hub.challenge': string;
}

/**
 * DTO for WhatsApp error
 */
export class WhatsAppErrorDto {
  @IsNumber()
  code: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsObject()
  error_data?: Record<string, any>;
}

/**
 * DTO for WhatsApp status
 */
export class WhatsAppStatusDto {
  @IsString()
  id: string;

  @IsEnum(['sent', 'delivered', 'read', 'failed'])
  status: 'sent' | 'delivered' | 'read' | 'failed';

  @IsString()
  timestamp: string;

  @IsString()
  recipient_id: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppErrorDto)
  errors?: WhatsAppErrorDto[];
}

/**
 * DTO for incoming WhatsApp message
 */
export class WhatsAppIncomingMessageDto {
  @IsString()
  from: string;

  @IsString()
  id: string;

  @IsString()
  timestamp: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsObject()
  text?: {
    body: string;
  };
}

/**
 * DTO for webhook value
 */
export class WhatsAppWebhookValueDto {
  @IsString()
  messaging_product: string;

  @IsObject()
  metadata: {
    phone_number_id: string;
    display_phone_number: string;
  };

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppStatusDto)
  statuses?: WhatsAppStatusDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppIncomingMessageDto)
  messages?: WhatsAppIncomingMessageDto[];
}

/**
 * DTO for webhook change
 */
export class WhatsAppWebhookChangeDto {
  @ValidateNested()
  @Type(() => WhatsAppWebhookValueDto)
  value: WhatsAppWebhookValueDto;

  @IsString()
  field: string;
}

/**
 * DTO for webhook entry
 */
export class WhatsAppWebhookEntryDto {
  @IsString()
  id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppWebhookChangeDto)
  changes: WhatsAppWebhookChangeDto[];
}

/**
 * DTO for webhook event (POST request)
 */
export class WhatsAppWebhookEventDto {
  @IsString()
  object: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppWebhookEntryDto)
  entry: WhatsAppWebhookEntryDto[];
}


