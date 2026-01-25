import { ApiProperty } from '@nestjs/swagger';

export class AdminOverviewDto {
  @ApiProperty({
    description: 'Total number of centers in the system',
    example: 15,
  })
  totalCenters: number;

  @ApiProperty({
    description: 'Number of active centers',
    example: 12,
  })
  activeCenters: number;

  @ApiProperty({
    description: 'Total number of users across all centers',
    example: 1250,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Total revenue across all centers',
    example: 150000.5,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Revenue for the current month',
    example: 25000.75,
  })
  monthlyRevenue: number;

  @ApiProperty({
    description: 'Overall system health status',
    example: 'healthy',
    enum: ['healthy', 'warning', 'critical'],
  })
  systemHealth: string;

  @ApiProperty({
    description: 'Recent system activity',
    type: [Object],
    example: [
      {
        action: 'CENTER_CREATED',
        centerName: 'New Learning Center',
        timestamp: '2024-01-15T10:30:00Z',
      },
    ],
  })
  recentActivity: any[];
}
