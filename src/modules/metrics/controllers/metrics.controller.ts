import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { Response } from 'express';

@ApiTags('Metrics')
@Controller()
export class MetricsController extends PrometheusController {
  @Get('/metrics')
  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description: 'Returns all application metrics in Prometheus format for monitoring and alerting',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics returned successfully',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: '# HELP lms_http_request_duration_seconds Duration of HTTP requests in seconds\n# TYPE lms_http_request_duration_seconds histogram\nlms_http_request_duration_seconds_bucket{method="GET",route="/health",status_code="200",le="0.1"} 1\n...'
        }
      }
    }
  })
  async index(@Res() response: Response) {
    return super.index(response);
  }
}
