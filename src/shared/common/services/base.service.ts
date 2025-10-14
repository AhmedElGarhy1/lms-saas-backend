import { exportToXlsx } from '../utils/export-builder.util';

export abstract class BaseService<T> {
  // constructor(protected readonly repo: Repository<T>) {}
  // abstract mapEntityToExportRow(entity: T): Record<string, any>;
  // async exportAll(sheetName?: string): Promise<Buffer> {
  //   const items = await this.repo.find();
  //   const rows = items.map((i) => this.mapEntityToExportRow(i));
  //   return exportToXlsx(rows, sheetName ?? this.repo.metadata.name);
  // }
}
