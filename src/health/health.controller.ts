import { Controller, Get } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Controller('health')
export class HealthController {
  constructor(private readonly dbService: DbService) {}

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
