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

  @ApiProperty()
  isActive: boolean;

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

