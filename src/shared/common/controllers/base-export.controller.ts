import {
  Controller,
  Get,
  Query,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ExportService, ExportOptions } from '../services/export.service';
import { ExportResponseDto } from '../dto/export-response.dto';

export interface ExportQueryDto {
  format?: 'csv' | 'xlsx' | 'json';
  filename?: string;
  [key: string]: any; // For additional filtering parameters
}

export abstract class BaseExportController<T> {
  constructor(protected readonly exportService: ExportService) {}

  /**
   * Generic export endpoint
   */
  @Get('export')
  @ApiOperation({ summary: 'Export data' })
  @ApiQuery({ name: 'format', enum: ['csv', 'xlsx', 'json'], required: false })
  @ApiQuery({ name: 'filename', type: String, required: false })
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
  })
  async export(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ): Promise<ExportResponseDto> {
    try {
      const format = query.format || 'csv';

      // Get data using the same pagination logic
      const data = await this.getDataForExport(query);

      // Generate base filename
      const baseFilename = query.filename || this.getDefaultFilename();

      // Use the simplified export method
      return await this.exportService.exportData(
        data,
        this.getExportMapper(),
        format,
        baseFilename,
        res,
      );
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new HttpException(
        `Export failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Abstract methods to be implemented by child classes
   */
  protected abstract getDataForExport(query: ExportQueryDto): Promise<T[]>;
  protected abstract getExportMapper(): any; // ExportMapper<T, any>
  protected abstract getExportHeaders(): string[];
  protected abstract getDefaultFilename(): string;
}
