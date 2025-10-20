import { IntersectionType } from '@nestjs/swagger';
import { ExportQueryDto } from '@/shared/common/dto/export-query.dto';
import { PaginateBranchesDto } from './paginate-branches.dto';

export class ExportBranchesDto extends IntersectionType(
  PaginateBranchesDto,
  ExportQueryDto,
) {}
