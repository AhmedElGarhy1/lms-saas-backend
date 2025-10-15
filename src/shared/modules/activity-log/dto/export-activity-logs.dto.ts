import { IntersectionType } from '@nestjs/swagger';
import { ExportQueryDto } from '@/shared/common/dto/export-query.dto';
import { PaginateActivityLogsDto } from './paginate-activity-logs.dto';

export class ExportActivityLogsDto extends IntersectionType(
  PaginateActivityLogsDto,
  ExportQueryDto,
) {}
