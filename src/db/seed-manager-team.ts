/**
 * Seed script to create demo data for manager team views
 * Creates:
 * - 1 manager user
 * - 2 employee users (direct reports)
 * - Submitted timesheets for employees
 * - Pending leave requests for employees
 * - Sample holidays
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema';
import * as bcrypt from 'bcrypt';

const {
  tenants,
  users,
  memberships,
  profiles,
  timesheets,
  benefitRequests,
  benefitTypes,
  benefitBalances,
  holidays,
} = schema;

async function seed() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL || 'postgresql://admin:Qazxsw22!@localhost:5432/kairos',
  });

  const db = drizzle(pool, { schema });

  console.log('🌱 Starting seed for manager team demo data...');

  try {
    // 1. Create or get tenant
    console.log('Creating tenant...');
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: 'Demo Company',
        slug: 'demo-company',
      })
      .onConflictDoNothing()
      .returning();

    const tenantId =
      tenant?.id ||
      (await db.select().from(tenants).where(eq(tenants.slug, 'demo-company')).limit(1))[0].id;

    console.log(`✓ Tenant: ${tenantId}`);

    // 2. Create manager user
    console.log('Creating manager user...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const [manager] = await db
      .insert(users)
      .values({
        email: 'manager@demo.com',
        passwordHash,
        name: 'Alice Manager',
      })
      .onConflictDoNothing()
      .returning();

    const managerId =
      manager?.id ||
      (await db.select().from(users).where(eq(users.email, 'manager@demo.com')).limit(1))[0].id;

    console.log(`✓ Manager user: ${managerId}`);

    // Create manager membership
    await db
      .insert(memberships)
      .values({
        tenantId,
        userId: managerId,
        role: 'manager',
        status: 'active',
      })
      .onConflictDoNothing();

    // Create manager profile
    await db
      .insert(profiles)
      .values({
        tenantId,
        userId: managerId,
        jobTitle: 'Engineering Manager',
      })
      .onConflictDoNothing();

    // 3. Create employee users
    console.log('Creating employee users...');
    const employees = [];

    for (const emp of [
      { email: 'bob@demo.com', name: 'Bob Employee', title: 'Software Engineer' },
      { email: 'carol@demo.com', name: 'Carol Developer', title: 'Senior Engineer' },
    ]) {
      const [employee] = await db
        .insert(users)
        .values({
          email: emp.email,
          passwordHash,
          name: emp.name,
        })
        .onConflictDoNothing()
        .returning();

      const employeeId =
        employee?.id ||
        (await db.select().from(users).where(eq(users.email, emp.email)).limit(1))[0].id;

      employees.push(employeeId);

      // Create membership
      await db
        .insert(memberships)
        .values({
          tenantId,
          userId: employeeId,
          role: 'employee',
          status: 'active',
        })
        .onConflictDoNothing();

      // Create profile with manager relationship
      await db
        .insert(profiles)
        .values({
          tenantId,
          userId: employeeId,
          jobTitle: emp.title,
          managerUserId: managerId,
        })
        .onConflictDoNothing();

      console.log(`✓ Employee: ${employeeId} (${emp.name})`);
    }

    // 4. Create benefit types and balances
    console.log('Creating benefit types...');
    const [vacationBenefit] = await db
      .insert(benefitTypes)
      .values({
        tenantId,
        key: 'vacation',
        name: 'Vacation Days',
        unit: 'days',
        requiresApproval: true,
      })
      .onConflictDoNothing()
      .returning();

    const benefitTypeId =
      vacationBenefit?.id ||
      (await db.select().from(benefitTypes).where(eq(benefitTypes.key, 'vacation')).limit(1))[0]
        ?.id;

    if (benefitTypeId) {
      for (const empId of employees) {
        await db
          .insert(benefitBalances)
          .values({
            tenantId,
            userId: empId,
            benefitTypeId,
            currentBalance: '15.00',
          })
          .onConflictDoNothing();
      }
      console.log('✓ Benefit balances created');
    }

    // 5. Create submitted timesheets
    console.log('Creating timesheets...');
    const weekStart = '2025-10-13'; // Monday of current week

    for (const empId of employees) {
      await db
        .insert(timesheets)
        .values({
          tenantId,
          userId: empId,
          weekStartDate: weekStart,
          status: 'submitted',
          submittedAt: new Date(),
          submittedByUserId: empId,
        })
        .onConflictDoNothing();
    }
    console.log('✓ Timesheets created');

    // 6. Create pending leave requests
    console.log('Creating leave requests...');
    if (benefitTypeId) {
      await db
        .insert(benefitRequests)
        .values({
          tenantId,
          userId: employees[0],
          benefitTypeId,
          startDate: new Date('2025-10-20'),
          endDate: new Date('2025-10-22'),
          amount: '3',
          status: 'pending',
          note: 'Family vacation',
        })
        .onConflictDoNothing();

      await db
        .insert(benefitRequests)
        .values({
          tenantId,
          userId: employees[1],
          benefitTypeId,
          startDate: new Date('2025-10-27'),
          endDate: new Date('2025-10-29'),
          amount: '3',
          status: 'pending',
          note: 'Personal time off',
        })
        .onConflictDoNothing();

      console.log('✓ Leave requests created');
    }

    // 7. Create sample holidays
    console.log('Creating holidays...');
    await db
      .insert(holidays)
      .values([
        {
          tenantId,
          countryCode: 'US',
          date: new Date('2025-11-28'),
          name: 'Thanksgiving',
        },
        {
          tenantId,
          countryCode: 'US',
          date: new Date('2025-12-25'),
          name: 'Christmas',
        },
      ])
      .onConflictDoNothing();

    console.log('✓ Holidays created');

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('Manager: manager@demo.com / password123');
    console.log('Employee 1: bob@demo.com / password123');
    console.log('Employee 2: carol@demo.com / password123');
    console.log('\n💡 Usage:');
    console.log('1. Login as manager@demo.com');
    console.log('2. Use GET /timesheets?team=true&status=submitted');
    console.log('3. Use GET /leave-requests?team=true&status=pending');
    console.log('4. Use GET /calendar?user_id=<employee_id>&from=2025-10-01&to=2025-12-31');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
