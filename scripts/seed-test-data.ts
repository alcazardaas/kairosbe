import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/kairos',
});

async function seedTestData() {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding test data...');

    // Create a test tenant
    const tenantResult = await client.query(`
      INSERT INTO tenants (id, name, slug, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id, name, slug
    `, ['00000000-0000-0000-0000-000000000001', 'Test Company', 'test-company']);

    if (tenantResult.rows.length > 0) {
      console.log('✅ Created tenant:', tenantResult.rows[0]);
    } else {
      console.log('ℹ️  Tenant already exists');
    }

    // Create a test user
    const userResult = await client.query(`
      INSERT INTO users (id, email, name, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id, email, name
    `, ['00000000-0000-0000-0000-000000000002', 'test@example.com', 'Test User']);

    if (userResult.rows.length > 0) {
      console.log('✅ Created user:', userResult.rows[0]);
    } else {
      console.log('ℹ️  User already exists');
    }

    console.log('✅ Test data seeded successfully!');
    console.log('\nYou can now use:');
    console.log('  tenant_id: 00000000-0000-0000-0000-000000000001');
    console.log('  user_id:   00000000-0000-0000-0000-000000000002');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedTestData();
