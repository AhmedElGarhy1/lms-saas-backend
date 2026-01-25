import { ApiProperty } from '@nestjs/swagger';
import { Money } from '@/shared/common/utils/money.util';

export class PaymentMethodMetricsDto {
  @ApiProperty({
    description: 'Revenue from this payment method',
    example: 12500.0,
  })
  revenue: Money;

  @ApiProperty({
    description: 'Expenses from this payment method',
    example: 8750.0,
  })
  expenses: Money;

  @ApiProperty({
    description: 'Net profit/loss for this payment method',
    example: 3750.0,
  })
  net: Money;
}

export class TotalMetricsDto {
  @ApiProperty({
    description: 'Total revenue across all payment methods',
    example: 18750.0,
  })
  revenue: Money;

  @ApiProperty({
    description: 'Total expenses across all payment methods',
    example: 11250.0,
  })
  expenses: Money;

  @ApiProperty({
    description: 'Total profit/loss across all payment methods',
    example: 7500.0,
  })
  profit: Money;
}

export class PendingTeacherPayablesDto {
  @ApiProperty({
    description: 'Number of pending teacher payouts requiring approval',
    example: 5,
  })
  count: number;

  @ApiProperty({
    description: 'Total amount of pending teacher payouts',
    example: 2500.0,
  })
  totalAmount: Money;
}

export class CurrentMonthMetricsDto {
  @ApiProperty({
    description: 'Financial metrics for wallet payments this month',
    type: PaymentMethodMetricsDto,
  })
  wallet: PaymentMethodMetricsDto;

  @ApiProperty({
    description: 'Financial metrics for cash payments this month',
    type: PaymentMethodMetricsDto,
  })
  cash: PaymentMethodMetricsDto;

  @ApiProperty({
    description:
      'Total financial metrics across all payment methods this month',
    type: TotalMetricsDto,
  })
  total: TotalMetricsDto;

  @ApiProperty({
    description: 'Number of teachers with active classes this month',
    example: 10,
  })
  activeTeachers: number;

  @ApiProperty({
    description: 'Number of students enrolled in active classes this month',
    example: 135,
  })
  activeStudents: number;
}

export class AllTimeMetricsDto {
  @ApiProperty({
    description: 'Total number of students registered in the center (all-time)',
    example: 150,
  })
  students: number;

  @ApiProperty({
    description: 'Total number of teachers working in the center (all-time)',
    example: 12,
  })
  teachers: number;

  @ApiProperty({
    description: 'Total number of staff members in the center (all-time)',
    example: 8,
  })
  staff: number;

  @ApiProperty({
    description:
      'Number of currently active teachers (assigned to active classes)',
    example: 10,
  })
  activeTeachers: number;

  @ApiProperty({
    description:
      'Number of currently active students (enrolled in active groups)',
    example: 135,
  })
  activeStudents: number;
}

export class CenterOverviewDto {
  @ApiProperty({
    description:
      'Total cash balance across all center cashboxes (current snapshot)',
    example: 15750.5,
  })
  cashBoxBalance: Money;

  @ApiProperty({
    description:
      'Total wallet balance across all center wallets (current snapshot)',
    example: 22450.75,
  })
  walletBalance: Money;

  @ApiProperty({
    description: 'Current month financial and activity metrics',
    type: CurrentMonthMetricsDto,
  })
  currentMonth: CurrentMonthMetricsDto;

  @ApiProperty({
    description: 'All-time totals for center',
    type: AllTimeMetricsDto,
  })
  allTime: AllTimeMetricsDto;

  @ApiProperty({
    description: 'Pending teacher payouts requiring approval',
    type: PendingTeacherPayablesDto,
  })
  pendingTeacherPayables: PendingTeacherPayablesDto;

  @ApiProperty({
    description: 'When this data was last calculated',
    example: '2024-01-19T10:30:00Z',
  })
  lastUpdated: Date;
}
