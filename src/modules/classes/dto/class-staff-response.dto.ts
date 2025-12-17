import { ApiProperty } from '@nestjs/swagger';

export class ClassStaffResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userProfileId: string;

  @ApiProperty()
  classId: string;

  @ApiProperty()
  centerId: string;

  @ApiProperty({ required: false })
  joinedAt?: Date;

  @ApiProperty({ required: false })
  leftAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  profile?: {
    id: string;
    userId: string;
    profileType: string;
    isActive: boolean;
  };

  @ApiProperty({ required: false })
  class?: {
    id: string;
    name?: string;
    centerId: string;
    branchId: string;
  };
}
