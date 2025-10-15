import { Controller, Get } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly dbService: DbService) {}

  @Public()
  @Get()
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
