/**
 * Seed script to create test data for authentication testing
 *
 * Run with: tsx src/db/seed-auth-test.ts
 *
 * Creates:
 * - Test tenant: Acme Corp (slug: acme-corp)
 * - Test user: test@example.com (password: Password123!)
 * - Membership: test user as admin in Acme Corp
 */

import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/kairos';

async function seed() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🌱 Seeding authentication test data...');
    console.log(`📦 Database: ${DATABASE_URL.replace(/\/\/.*@/, '//****@')}`);

    // Hash the test password
    const passwordHash = await bcrypt.hash('Password123!', 12);

    // Create tenant
    const tenantResult = await pool.query(`
      INSERT INTO tenants (name, slug)
      VALUES ('Acme Corp', 'acme-corp')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, slug
    `);
    const tenant = tenantResult.rows[0];
    console.log(`✅ Created tenant: ${tenant.name} (${tenant.slug}) - ID: ${tenant.id}`);

    // Create user
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, name, locale)
      VALUES ('test@example.com', $1, 'Test User', 'en')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name
      RETURNING id, email, name
    `, [passwordHash]);
    const user = userResult.rows[0];
    console.log(`✅ Created user: ${user.email} (${user.name}) - ID: ${user.id}`);

    // Create membership
    const membershipResult = await pool.query(`
      INSERT INTO memberships (tenant_id, user_id, role, status)
      VALUES ($1, $2, 'admin', 'active')
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        status = EXCLUDED.status
      RETURNING id, role, status
    `, [tenant.id, user.id]);
    const membership = membershipResult.rows[0];
    console.log(`✅ Created membership: ${membership.role} (${membership.status}) - ID: ${membership.id}`);

    // Create timesheet policy for tenant
    const policyResult = await pool.query(`
      INSERT INTO timesheet_policies (tenant_id, week_start, max_hours_per_day, allow_overtime, lock_after_approval)
      VALUES ($1, 1, 12, true, true)
      ON CONFLICT (tenant_id) DO UPDATE SET
        week_start = EXCLUDED.week_start,
        max_hours_per_day = EXCLUDED.max_hours_per_day
      RETURNING tenant_id, week_start, max_hours_per_day
    `, [tenant.id]);
    const policy = policyResult.rows[0];
    console.log(`✅ Created timesheet policy: week_start=${policy.week_start}, max_hours=${policy.max_hours_per_day}`);

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('Test credentials:');
    console.log('  Email: test@example.com');
    console.log('  Password: Password123!');
    console.log('  Tenant ID:', tenant.id);
    console.log('\nYou can now test login with:');
    console.log(`  curl -X POST http://localhost:3000/api/v1/auth/login \\`);
    console.log(`    -H "Content-Type: application/json" \\`);
    console.log(`    -d '{"email":"test@example.com","password":"Password123!"}'`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
