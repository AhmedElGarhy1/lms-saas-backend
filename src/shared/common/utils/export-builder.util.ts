import * as XLSX from 'xlsx';
import { ExportDataUnavailableException } from '../exceptions/custom.exceptions';

/**
 * Converts any array of objects into an Excel (XLSX) file Buffer.
 * Supports UTF-8 encoding and clean headers.
 */
export function exportToXlsx<T extends Record<string, any>>(
  data: T[],
  sheetName = 'Sheet1',
): Buffer {
  if (!data || data.length === 0) {
    throw new ExportDataUnavailableException();
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Converts any array of objects into CSV text.
 */
export function exportToCsv<T extends Record<string, any>>(data: T[]): string {
  if (!data || data.length === 0) {
    return '';
  }
  return XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(data));
}
