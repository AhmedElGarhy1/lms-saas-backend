import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '@/modules/centers/entities/center.entity';

export class CreateTeacherDto extends CreateUserDto {
  @ApiProperty({
    description: 'Center ID for the teacher',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Center)
  centerId?: string;
}

