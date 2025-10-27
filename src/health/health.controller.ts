import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { DbService } from '../db/db.service';
import { Public } from '../auth/decorators/public.decorator';
import { HealthCheckDto } from './dto/health-response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dbService: DbService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description:
      'Check the health status of the API and database connection. This endpoint is public and does not require authentication.',
  })
  @ApiOkResponse({
    description: 'Health status retrieved',
    type: HealthCheckDto,
  })
  async check() {
    // Simple health check
    const ts = new Date().toISOString();

    // Optionally check DB connection
    try {
      await this.dbService.getPool().query('SELECT 1');
      return {
        ok: true,
        ts,
        database: 'connected',
      };
    } catch (error) {
      return {
        ok: false,
        ts,
        database: 'disconnected',
        error: error.message,
      };
    }
  }
}
