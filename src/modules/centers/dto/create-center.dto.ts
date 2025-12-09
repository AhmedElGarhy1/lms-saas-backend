import { ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateCenterRequestDto } from './update-center.dto';
import { CreateBranchDto } from './create-branch.dto';

export class CreateCenterDto extends UpdateCenterRequestDto {
  // User object for center owner (optional - can create center without user)
  @ApiPropertyOptional({ type: CreateUserDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateUserDto)
  user?: CreateUserDto;

  // Branch object (required - center must have at least one branch)
  @ApiProperty({
    type: CreateBranchDto,
    description: 'Branch information for the center (required)',
  })
  @ValidateNested()
  @Type(() => CreateBranchDto)
  branch: CreateBranchDto;
}
