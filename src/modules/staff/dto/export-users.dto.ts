import { IntersectionType } from '@nestjs/swagger';
import { PaginateUsersDto } from './paginate-users.dto';
import { ExportQueryDto } from '@/shared/common/dto';

export class ExportUsersDto extends IntersectionType(
  PaginateUsersDto,
  ExportQueryDto,
) {}
