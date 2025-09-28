import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  @Get('ok')
  @ApiOperation({ summary: 'OK endpoint' })
  @ApiResponse({ status: 200, description: 'Returns OK status' })
  getOk() {
    return { status: 'ok' };
  }
}
