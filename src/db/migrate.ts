import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const runMigrations = async () => {
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/kairos';

  console.log('🚀 Running migrations...');
  console.log(`📦 Database: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

  const pool = new Pool({ connectionString });

  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigrations();
