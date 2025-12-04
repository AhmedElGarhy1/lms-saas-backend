import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ExportResponseDto } from '../dto/export-response.dto';
import {
  ExportFormatNotSupportedException,
  ExportDataUnavailableException,
} from '../exceptions/custom.exceptions';
import { ExportFormat } from '../dto';
import { BaseService } from './base.service';

export interface ExportOptions {
  filename: string;
  format: 'csv' | 'xlsx' | 'json';
  headers?: string[];
  mimeType?: string;
}

export interface ExportMapper<T, R extends Record<string, any>> {
  mapToExport(data: T): R;
  getHeaders(): string[];
}

@Injectable()
export class ExportService extends BaseService {
  private readonly logger: Logger = new Logger(ExportService.name);

  constructor() {
    super();
  }

  /**
   * Export data to CSV format
   */
  async exportToCsv<T, R extends Record<string, any>>(
    data: T[],
    mapper: ExportMapper<T, R>,
    filename: string,
    res: Response,
  ): Promise<ExportResponseDto> {
    try {
      const headers = mapper.getHeaders();
      const csvData = this.convertToCsv(data, mapper, headers);
      const fileSize = Buffer.byteLength(csvData, 'utf8');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.csv"`,
      );
      res.send(csvData);

      return {
        success: true,
        message: {
          key: 't.success.export',
          args: { resource: 'CSV' },
        },
        filename: `${filename}.csv`,
        format: 'csv',
        recordCount: data.length,
        fileSize,
        exportedAt: new Date().toISOString(),
      } as ExportResponseDto;
    } catch (error: unknown) {
      this.logger.error(
        `CSV export failed - filename: ${filename}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Export data to XLSX format
   */
  async exportToXlsx<T, R extends Record<string, any>>(
    data: T[],
    mapper: ExportMapper<T, R>,
    filename: string,
    res: Response,
  ): Promise<ExportResponseDto> {
    try {
      const headers = mapper.getHeaders();
      const xlsxData = this.convertToXlsx(data, mapper, headers);
      const fileSize = xlsxData.length;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.xlsx"`,
      );
      res.send(xlsxData);

      return {
        success: true,
        message: {
          key: 't.success.export',
          args: { resource: 'XLSX' },
        },
        filename: `${filename}.xlsx`,
        format: 'xlsx',
        recordCount: data.length,
        fileSize,
        exportedAt: new Date().toISOString(),
      } as ExportResponseDto;
    } catch (error: unknown) {
      this.logger.error(
        `XLSX export failed - filename: ${filename}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Export data to JSON format
   */
  async exportToJson<T, R extends Record<string, any>>(
    data: T[],
    mapper: ExportMapper<T, R>,
    filename: string,
    res: Response,
  ): Promise<ExportResponseDto> {
    try {
      const jsonData = data.map((item) => mapper.mapToExport(item));
      const jsonString = JSON.stringify(jsonData, null, 2);
      const fileSize = Buffer.byteLength(jsonString, 'utf8');

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.json"`,
      );
      res.json(jsonData);

      return {
        success: true,
        message: {
          key: 't.success.export',
          args: { resource: 'JSON' },
        },
        filename: `${filename}.json`,
        format: 'json',
        recordCount: data.length,
        fileSize,
        exportedAt: new Date().toISOString(),
      } as ExportResponseDto;
    } catch (error: unknown) {
      this.logger.error(
        `JSON export failed - filename: ${filename}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Generic export method that handles different formats
   */
  async export<T, R extends Record<string, any>>(
    data: T[],
    mapper: ExportMapper<T, R>,
    options: ExportOptions,
    res: Response,
  ): Promise<ExportResponseDto> {
    switch (options.format) {
      case 'csv':
        return await this.exportToCsv(data, mapper, options.filename, res);
      case 'xlsx':
        return await this.exportToXlsx(data, mapper, options.filename, res);
      case 'json':
        return await this.exportToJson(data, mapper, options.filename, res);
      default:
        throw new ExportFormatNotSupportedException(
          options.format,
          't.errors.exportFormatNotSupported',
        );
    }
  }

  /**
   * Simplified export method that handles format selection and validation
   */
  async exportData(
    data: any[],
    mapper: ExportMapper<any, any>,
    format: ExportFormat,
    filename: string,
    res: Response,
  ): Promise<ExportResponseDto> {
    // Validate format
    if (!this.isValidFormat(format)) {
      throw new ExportFormatNotSupportedException(
        format,
        't.errors.exportFormatNotSupported',
      );
    }

    // Check for empty data
    if (!data || data.length === 0) {
      throw new ExportDataUnavailableException(
        't.errors.exportDataUnavailable',
      );
    }

    // Generate filename with timestamp
    const finalFilename = this.generateFilename(filename, format);

    // Export based on format
    if (format === 'csv') {
      return await this.exportToCsv(data, mapper, finalFilename, res);
    } else if (format === 'xlsx') {
      return await this.exportToXlsx(data, mapper, finalFilename, res);
    } else if (format === 'json') {
      return await this.exportToJson(data, mapper, finalFilename, res);
    } else {
      throw new ExportFormatNotSupportedException(
        format,
        't.errors.exportFormatNotSupported',
      );
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCsv<T, R extends Record<string, any>>(
    data: T[],
    mapper: ExportMapper<T, R>,
    headers: string[],
  ): string {
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const item of data) {
      const mappedData = mapper.mapToExport(item);
      const values = Object.values(mappedData).map((value) => {
        // Escape commas and quotes in CSV
        const stringValue = String(value || '');
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Convert data to XLSX format (simplified - you might want to use a library like xlsx)
   */
  private convertToXlsx<T, R extends Record<string, any>>(
    data: T[],
    mapper: ExportMapper<T, R>,
    headers: string[],
  ): Buffer {
    // For now, we'll return CSV data as XLSX
    // In a real implementation, you'd use a library like 'xlsx'
    const csvData = this.convertToCsv(data, mapper, headers);
    return Buffer.from(csvData, 'utf-8');
  }

  /**
   * Generate filename with timestamp
   */
  generateFilename(baseName: string, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${baseName}_${timestamp}`;
  }

  /**
   * Validate export format
   */
  isValidFormat(format: string): boolean {
    return ['csv', 'xlsx', 'json'].includes(format.toLowerCase());
  }
}
