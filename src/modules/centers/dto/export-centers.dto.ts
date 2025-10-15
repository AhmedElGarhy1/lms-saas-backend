import { IntersectionType } from '@nestjs/swagger';
import { ExportQueryDto } from '@/shared/common/dto/export-query.dto';
import { PaginateCentersDto } from './paginate-centers.dto';

export class ExportCentersDto extends IntersectionType(
  PaginateCentersDto,
  ExportQueryDto,
) {}
