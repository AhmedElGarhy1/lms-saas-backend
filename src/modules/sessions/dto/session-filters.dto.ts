import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '../enums/session-status.enum';
import {
  BelongsToBranch,
  BelongsToCenter,
  IsUserProfile,
} from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Group } from '@/modules/classes/entities/group.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';

/**
 * Shared filter DTO for session queries
 * Contains common filter fields used by both pagination and calendar endpoints
 */
export class SessionFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by group ID',
    type: String,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToBranch(Group)
  groupId?: string;

  @ApiPropertyOptional({
    description: 'Filter by class ID',
    type: String,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToBranch(Class)
  classId?: string;

  @ApiPropertyOptional({
    description: 'Filter by branch ID',
    type: String,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToCenter(Branch)
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Filter by teacher user profile ID',
    type: String,
  })
  @IsOptional()
  @IsUUID(4)
  @IsUserProfile(ProfileType.TEACHER)
  teacherUserProfileId?: string;

  @ApiPropertyOptional({
    description: 'Filter by student user profile ID',
    type: String,
  })
  @IsOptional()
  @IsUUID(4)
  @IsUserProfile(ProfileType.STUDENT)
  studentUserProfileId?: string;

  @ApiPropertyOptional({
    description: 'Filter by session status',
    enum: SessionStatus,
  })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;
}
