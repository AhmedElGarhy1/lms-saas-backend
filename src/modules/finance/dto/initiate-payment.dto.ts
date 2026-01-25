import {
  IsString,
  IsOptional,
  IsNumber,
  IsEmail,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentGatewayType } from '../adapters/interfaces/payment-gateway.interface';

export class InitiatePaymentDto {
  @ApiProperty({
    description:
      'Payment amount in the smallest currency unit (e.g., cents for USD/EGP)',
    example: 10000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'EGP',
    default: 'EGP',
  })
  @IsString()
  currency: string = 'EGP';

  @ApiPropertyOptional({
    description: 'Payment description',
    example: 'Wallet topup',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+201234567890',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Customer full name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    description: 'Payment gateway to use',
    example: 'paymob',
    enum: PaymentGatewayType,
    default: PaymentGatewayType.PAYMOB,
  })
  @IsOptional()
  @IsEnum(PaymentGatewayType)
  gateway?: PaymentGatewayType = PaymentGatewayType.PAYMOB;

  @ApiPropertyOptional({
    description: 'Idempotency key to prevent duplicate payments',
    example: 'unique-payment-key-123',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
