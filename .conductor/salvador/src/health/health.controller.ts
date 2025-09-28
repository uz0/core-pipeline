import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint for Kubernetes liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return { status: 'ok' };
  }

  @Get('ok')
  @ApiOperation({ summary: 'Readiness check endpoint for Kubernetes readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  getOk() {
    return { status: 'ok' };
  }
}