import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics' })
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', this.metricsService.getContentType());
    const metrics = await this.metricsService.getMetrics();
    res.send(metrics);
  }
}