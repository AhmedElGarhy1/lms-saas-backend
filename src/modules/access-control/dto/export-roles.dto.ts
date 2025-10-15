import { ExportQueryDto } from '@/shared/common/dto/export-query.dto';
import { PaginateRolesDto } from './paginate-roles.dto';
import { IntersectionType } from '@nestjs/swagger';

export class ExportRolesDto extends IntersectionType(
  PaginateRolesDto,
  ExportQueryDto,
) {}
