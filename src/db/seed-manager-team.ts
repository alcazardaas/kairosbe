/**
 * Seed script to create demo data for manager team views
 * Creates:
 * - 1 manager user
 * - 2 employee users (direct reports)
 * - 4 demo projects (Website, Mobile App, API, Internal Tools)
 * - Project memberships for all users
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
  projects,
  projectMembers,
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

    // 5. Create demo projects
    console.log('Creating projects...');
    const projectsData = [
      {
        name: 'Website Redesign',
        code: 'WEB-001',
        active: true,
        description: 'Complete redesign of the company website with modern UI/UX',
        startDate: '2025-11-01',
        endDate: '2026-02-28',
        clientName: 'Acme Corporation',
        budgetHours: '500.00',
      },
      {
        name: 'Mobile App Development',
        code: 'MOB-001',
        active: true,
        description: 'Native mobile app for iOS and Android platforms',
        startDate: '2025-12-01',
        endDate: '2026-06-30',
        clientName: 'TechStart Inc',
        budgetHours: '800.00',
      },
      {
        name: 'API Integration',
        code: 'API-001',
        active: true,
        description: 'Integration with third-party payment and CRM systems',
        startDate: '2025-11-15',
        endDate: '2026-01-31',
        clientName: 'Global Services Ltd',
        budgetHours: '200.00',
      },
      {
        name: 'Internal Tools',
        code: 'INT-001',
        active: true,
        description: 'Development of internal automation and reporting tools',
        startDate: '2025-10-01',
        endDate: '2026-12-31',
        clientName: null,
        budgetHours: '400.00',
      },
    ];

    const createdProjects = [];
    for (const proj of projectsData) {
      const [project] = await db
        .insert(projects)
        .values({
          tenantId,
          name: proj.name,
          code: proj.code,
          active: proj.active,
          description: proj.description,
          startDate: proj.startDate,
          endDate: proj.endDate,
          clientName: proj.clientName,
          budgetHours: proj.budgetHours,
        })
        .onConflictDoNothing()
        .returning();

      const projectId =
        project?.id ||
        (
          await db
            .select()
            .from(projects)
            .where(and(eq(projects.tenantId, tenantId), eq(projects.name, proj.name)))
            .limit(1)
        )[0]?.id;

      if (projectId) {
        createdProjects.push(projectId);
        console.log(`✓ Project: ${proj.name} (${projectId})`);
      }
    }

    // 6. Assign employees to projects
    console.log('Creating project memberships...');
    // Manager is assigned to all projects as observer
    for (const projectId of createdProjects) {
      await db
        .insert(projectMembers)
        .values({
          tenantId,
          projectId,
          userId: managerId,
          role: 'observer',
        })
        .onConflictDoNothing();
    }

    // Employee 1 (Bob) - assigned to first 2 projects
    if (createdProjects.length >= 2) {
      for (let i = 0; i < 2; i++) {
        await db
          .insert(projectMembers)
          .values({
            tenantId,
            projectId: createdProjects[i],
            userId: employees[0],
            role: 'member',
          })
          .onConflictDoNothing();
      }
      console.log(`✓ Assigned ${employees[0]} to 2 projects`);
    }

    // Employee 2 (Carol) - assigned to last 2 projects
    if (createdProjects.length >= 3) {
      for (let i = 2; i < Math.min(4, createdProjects.length); i++) {
        await db
          .insert(projectMembers)
          .values({
            tenantId,
            projectId: createdProjects[i],
            userId: employees[1],
            role: 'member',
          })
          .onConflictDoNothing();
      }
      console.log(`✓ Assigned ${employees[1]} to 2 projects`);
    }

    console.log('✓ Project memberships created');

    // 7. Create submitted timesheets
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

    // 8. Create pending leave requests
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

    // 9. Create sample holidays
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
    console.log('Employee 1: bob@demo.com / password123 (assigned to 2 projects)');
    console.log('Employee 2: carol@demo.com / password123 (assigned to 2 projects)');
    console.log('\n📊 Demo Data Created:');
    console.log(
      `- ${createdProjects.length} projects (Website Redesign, Mobile App, API Integration, Internal Tools)`,
    );
    console.log('- Project memberships for all users');
    console.log('- Submitted timesheets for employees');
    console.log('- Pending leave requests');
    console.log('- Sample holidays');
    console.log('\n💡 Usage:');
    console.log('1. Login as manager@demo.com or bob@demo.com');
    console.log('2. Use GET /api/v1/projects - View all projects');
    console.log('3. Use GET /api/v1/my/projects - View assigned projects');
    console.log('4. Use GET /api/v1/timesheets?team=true&status=submitted');
    console.log('5. Use GET /api/v1/leave-requests?team=true&status=pending');
    console.log('6. Use POST /api/v1/time-entries - Log time to assigned projects');
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
