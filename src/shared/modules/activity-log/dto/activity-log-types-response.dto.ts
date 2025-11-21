import { ApiProperty } from '@nestjs/swagger';

export class ActivityLogTypesResponseDto {
  @ApiProperty({
    description: 'System activity types',
    type: [String],
    example: ['DATA_EXPORTED', 'ACTIVITY_LOG_VIEWED', 'ACTIVITY_LOG_EXPORTED'],
  })
  system: string[];

  @ApiProperty({
    description: 'Authentication activity types',
    type: [String],
    example: [
      'USER_LOGIN',
      'USER_LOGIN_FAILED',
      'PASSWORD_CHANGED',
      'PASSWORD_RESET_REQUESTED',
      'EMAIL_VERIFIED',
      'PHONE_VERIFIED',
      'TWO_FA_ENABLED',
      'TWO_FA_DISABLED',
    ],
  })
  auth: string[];

  @ApiProperty({
    description: 'User activity types',
    type: [String],
    example: [
      'USER_CREATED',
      'USER_UPDATED',
      'USER_DELETED',
      'USER_RESTORED',
      'USER_ACTIVATED',
      'USER_DEACTIVATED',
      'USER_ACCESS_GRANTED',
      'USER_ACCESS_REVOKED',
    ],
  })
  user: string[];

  @ApiProperty({
    description: 'Center activity types',
    type: [String],
    example: [
      'CENTER_CREATED',
      'CENTER_UPDATED',
      'CENTER_DELETED',
      'CENTER_RESTORED',
      'CENTER_ACCESS_GRANTED',
      'CENTER_ACCESS_REVOKED',
      'CENTER_ACCESS_ACTIVATED',
      'CENTER_ACCESS_DEACTIVATED',
      'BRANCH_CREATED',
      'BRANCH_UPDATED',
      'BRANCH_DELETED',
      'BRANCH_RESTORED',
      'BRANCH_ACCESS_GRANTED',
      'BRANCH_ACCESS_REVOKED',
    ],
  })
  center: string[];

  @ApiProperty({
    description: 'Role activity types',
    type: [String],
    example: [
      'ROLE_CREATED',
      'ROLE_UPDATED',
      'ROLE_DELETED',
      'ROLE_RESTORED',
      'ROLE_ASSIGNED',
      'ROLE_REMOVED',
    ],
  })
  role: string[];

  @ApiProperty({
    description: 'Staff activity types',
    type: [String],
    example: ['STAFF_CREATED'],
  })
  staff: string[];

  @ApiProperty({
    description: 'Admin activity types',
    type: [String],
    example: ['ADMIN_CREATED'],
  })
  admin: string[];
}

