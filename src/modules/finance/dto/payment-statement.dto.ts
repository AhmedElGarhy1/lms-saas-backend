import { ApiProperty } from '@nestjs/swagger';

export class UserPaymentStatementItemDto {
  @ApiProperty({ description: 'Payment ID' })
  id: string;

  @ApiProperty({ description: 'Payment creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Payment update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Payment amount' })
  amount: number;

  @ApiProperty({
    description: 'Signed payment amount (negative for sent payments, positive for received payments)',
  })
  signedAmount: number;

  @ApiProperty({ description: 'Payment status' })
  status: string;

  @ApiProperty({ description: 'Payment reason' })
  reason: string;

  @ApiProperty({ description: 'Payment source' })
  source: string;

  @ApiProperty({ description: 'Sender ID' })
  senderId: string;

  @ApiProperty({ description: 'Receiver ID' })
  receiverId: string;

  @ApiProperty({ description: 'Correlation ID', nullable: true })
  correlationId?: string;

  @ApiProperty({ description: 'Payment date', nullable: true })
  paidAt?: Date;

  @ApiProperty({ description: 'Readable name of the sender' })
  senderName: string;

  @ApiProperty({ description: 'Readable name of the receiver' })
  receiverName: string;

  @ApiProperty({ description: 'User role in payment (sender/receiver)' })
  userRole: 'sender' | 'receiver';
}
