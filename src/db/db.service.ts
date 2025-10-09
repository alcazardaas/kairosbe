import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  private pool: Pool;
  public db: NodePgDatabase<typeof schema>;

  async onModuleInit() {
    const connectionString =
      process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/kairos';

    this.logger.log('Initializing database connection...');

    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.db = drizzle(this.pool, { schema });

    // Test connection
    try {
      await this.pool.query('SELECT 1');
      this.logger.log('✅ Database connection established');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Closing database connection...');
    await this.pool.end();
  }

  /**
   * Get the raw Drizzle database instance
   */
  getDb(): NodePgDatabase<typeof schema> {
    return this.db;
  }

  /**
   * Get the raw pg Pool instance (for advanced use cases)
   */
  getPool(): Pool {
    return this.pool;
  }
}
