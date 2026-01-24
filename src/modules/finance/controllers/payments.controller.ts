import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { Payment } from '../entities/payment.entity';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('finance/payments')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get(':paymentId')
  @ApiOperation({
    summary: 'Get payment details',
    description:
      'Get detailed information about a specific payment, including related business entities (teacher payouts, student charges, etc.). Access control ensures users can only view payments they have permission to access.',
  })
  @ApiParam({
    name: 'paymentId',
    description: 'Payment ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found or not accessible',
  })
  async getPayment(
    @Param('paymentId') paymentId: string,
  ): Promise<ControllerResponse<Payment>> {
    const payment =
      await this.paymentService.getPaymentWithRelations(paymentId);

    return ControllerResponse.success(payment);
  }
}
