/**
 * Comprehensive demo data seed script
 *
 * Creates a complete working dataset for frontend testing including:
 * - Tenant with timesheet policy
 * - Users (admin, manager, employees) with valid passwords
 * - Projects and tasks
 * - Project memberships
 * - Benefit types and balances
 * - Timesheets (draft, submitted, approved)
 * - Time entries
 * - Leave requests (pending, approved)
 * - Holidays
 * - User profiles with manager relationships
 *
 * Run with: pnpm tsx scripts/seed-demo-data.ts
 */

import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/kairos';

async function seed() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('🌱 Starting comprehensive demo data seed...');
    console.log(`📦 Database: ${DATABASE_URL.replace(/\/\/.*@/, '//****@')}\n`);

    // Hash passwords (all use 'Password123!' for demo - meets 8+ char requirement)
    const passwordHash = await bcrypt.hash('Password123!', 12);

    // ===== 1. TENANT & POLICY =====
    console.log('1️⃣  Creating tenant and policy...');

    const tenantResult = await client.query(`
      INSERT INTO tenants (name, slug)
      VALUES ('Demo Company', 'demo-company')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, slug
    `);
    const tenant = tenantResult.rows[0];
    console.log(`   ✓ Tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`     ID: ${tenant.id}`);

    await client.query(`
      INSERT INTO timesheet_policies (tenant_id, week_start, max_hours_per_day, allow_overtime, lock_after_approval)
      VALUES ($1, 1, 12, true, true)
      ON CONFLICT (tenant_id) DO UPDATE SET
        week_start = EXCLUDED.week_start,
        max_hours_per_day = EXCLUDED.max_hours_per_day,
        allow_overtime = EXCLUDED.allow_overtime,
        lock_after_approval = EXCLUDED.lock_after_approval
    `, [tenant.id]);
    console.log('   ✓ Timesheet policy: week starts Monday, max 12h/day\n');

    // ===== 2. USERS =====
    console.log('2️⃣  Creating users...');

    const users = [
      { email: 'admin@demo.com', name: 'Admin User', role: 'admin', title: 'System Administrator', managerId: null },
      { email: 'manager@demo.com', name: 'Alice Manager', role: 'manager', title: 'Engineering Manager', managerId: null },
      { email: 'bob@demo.com', name: 'Bob Employee', role: 'employee', title: 'Software Engineer', managerId: null },
      { email: 'carol@demo.com', name: 'Carol Developer', role: 'employee', title: 'Senior Engineer', managerId: null },
      { email: 'dave@demo.com', name: 'Dave Tester', role: 'employee', title: 'QA Engineer', managerId: null },
    ];

    const userIds = {};

    for (const user of users) {
      const result = await client.query(`
        INSERT INTO users (email, password_hash, name, locale)
        VALUES ($1, $2, $3, 'en')
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          name = EXCLUDED.name
        RETURNING id, email, name
      `, [user.email, passwordHash, user.name]);

      const createdUser = result.rows[0];
      userIds[user.email] = createdUser.id;

      // Create membership
      await client.query(`
        INSERT INTO memberships (tenant_id, user_id, role, status)
        VALUES ($1, $2, $3, 'active')
        ON CONFLICT (tenant_id, user_id) DO UPDATE SET
          role = EXCLUDED.role,
          status = EXCLUDED.status
      `, [tenant.id, createdUser.id, user.role]);

      console.log(`   ✓ ${user.name} (${user.email}) - ${user.role}`);
      console.log(`     ID: ${createdUser.id}`);
    }

    // Set manager relationships
    const managerId = userIds['manager@demo.com'];
    users[2].managerId = managerId; // Bob reports to Alice
    users[3].managerId = managerId; // Carol reports to Alice
    users[4].managerId = managerId; // Dave reports to Alice

    // Create profiles with manager relationships
    for (const user of users) {
      // Check if profile exists first
      const existingProfile = await client.query(`
        SELECT id FROM profiles WHERE tenant_id = $1 AND user_id = $2
      `, [tenant.id, userIds[user.email]]);

      if (existingProfile.rows.length === 0) {
        await client.query(`
          INSERT INTO profiles (tenant_id, user_id, job_title, start_date, manager_user_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [tenant.id, userIds[user.email], user.title, '2024-01-15', user.managerId]);
      } else {
        await client.query(`
          UPDATE profiles
          SET job_title = $1, start_date = $2, manager_user_id = $3
          WHERE tenant_id = $4 AND user_id = $5
        `, [user.title, '2024-01-15', user.managerId, tenant.id, userIds[user.email]]);
      }
    }
    console.log('   ✓ Created profiles with manager relationships\n');

    // ===== 3. PROJECTS & TASKS =====
    console.log('3️⃣  Creating projects and tasks...');

    const projects = [
      { name: 'Kairos Platform', code: 'KAI', active: true },
      { name: 'Client Portal', code: 'CPT', active: true },
      { name: 'Mobile App', code: 'MOB', active: true },
      { name: 'Legacy System Migration', code: 'LEG', active: false },
    ];

    const projectIds = {};

    for (const project of projects) {
      const result = await client.query(`
        INSERT INTO projects (tenant_id, name, code, active)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, name) DO UPDATE SET
          code = EXCLUDED.code,
          active = EXCLUDED.active
        RETURNING id, name, code
      `, [tenant.id, project.name, project.code, project.active]);

      const createdProject = result.rows[0];
      projectIds[project.name] = createdProject.id;
      console.log(`   ✓ ${project.name} (${project.code})`);

      // Create tasks for each project
      const tasks = [
        'Backend Development',
        'Frontend Development',
        'Testing & QA',
        'Documentation',
        'Code Review',
      ];

      for (const taskName of tasks) {
        await client.query(`
          INSERT INTO tasks (tenant_id, project_id, name)
          VALUES ($1, $2, $3)
          ON CONFLICT (tenant_id, project_id, name) DO NOTHING
        `, [tenant.id, createdProject.id, taskName]);
      }
    }
    console.log('   ✓ Created tasks for all projects\n');

    // ===== 4. PROJECT MEMBERSHIPS =====
    console.log('4️⃣  Assigning project members...');

    const projectMemberships = [
      { projectName: 'Kairos Platform', userEmail: 'bob@demo.com' },
      { projectName: 'Client Portal', userEmail: 'bob@demo.com' },
      { projectName: 'Kairos Platform', userEmail: 'carol@demo.com' },
      { projectName: 'Mobile App', userEmail: 'carol@demo.com' },
      { projectName: 'Client Portal', userEmail: 'dave@demo.com' },
    ];

    for (const membership of projectMemberships) {
      const existing = await client.query(`
        SELECT id FROM project_members
        WHERE tenant_id = $1 AND project_id = $2 AND user_id = $3
      `, [tenant.id, projectIds[membership.projectName], userIds[membership.userEmail]]);

      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO project_members (tenant_id, project_id, user_id, role)
          VALUES ($1, $2, $3, 'member')
        `, [tenant.id, projectIds[membership.projectName], userIds[membership.userEmail]]);
      }
    }

    console.log('   ✓ Bob: Kairos Platform, Client Portal');
    console.log('   ✓ Carol: Kairos Platform, Mobile App');
    console.log('   ✓ Dave: Client Portal\n');

    // ===== 5. BENEFIT TYPES & BALANCES =====
    console.log('5️⃣  Creating benefit types and balances...');

    const benefitTypes = [
      { key: 'vacation', name: 'Vacation Days', unit: 'days', requiresApproval: true },
      { key: 'sick', name: 'Sick Days', unit: 'days', requiresApproval: false },
      { key: 'personal', name: 'Personal Days', unit: 'days', requiresApproval: true },
    ];

    const benefitTypeIds = {};

    for (const benefit of benefitTypes) {
      const result = await client.query(`
        INSERT INTO benefit_types (tenant_id, key, name, unit, requires_approval)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tenant_id, key) DO UPDATE SET
          name = EXCLUDED.name,
          unit = EXCLUDED.unit,
          requires_approval = EXCLUDED.requires_approval
        RETURNING id, key, name
      `, [tenant.id, benefit.key, benefit.name, benefit.unit, benefit.requiresApproval]);

      benefitTypeIds[benefit.key] = result.rows[0].id;
      console.log(`   ✓ ${benefit.name} (${benefit.unit})`);
    }

    // Create balances for employees
    const employeeEmails = ['bob@demo.com', 'carol@demo.com', 'dave@demo.com'];
    for (const email of employeeEmails) {
      for (const [key, typeId] of Object.entries(benefitTypeIds)) {
        const balance = key === 'vacation' ? 15 : key === 'sick' ? 10 : 5;
        await client.query(`
          INSERT INTO benefit_balances (tenant_id, user_id, benefit_type_id, current_balance)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (tenant_id, user_id, benefit_type_id) DO UPDATE SET
            current_balance = EXCLUDED.current_balance
        `, [tenant.id, userIds[email], typeId, balance]);
      }
    }
    console.log('   ✓ Created balances for all employees\n');

    // ===== 6. TIMESHEETS & TIME ENTRIES =====
    console.log('6️⃣  Creating timesheets and time entries...');

    // Week dates (3 weeks: 2 weeks ago, last week, current week)
    const weeks = [
      '2025-10-06', // 2 weeks ago - approved
      '2025-10-13', // last week - submitted
      '2025-10-20', // current week - draft
    ];

    const statuses = ['approved', 'submitted', 'draft'];

    for (let weekIdx = 0; weekIdx < weeks.length; weekIdx++) {
      const weekStart = weeks[weekIdx];
      const status = statuses[weekIdx];

      // Create timesheet for Bob
      const bobTimesheetExisting = await client.query(`
        SELECT id FROM timesheets WHERE tenant_id = $1 AND user_id = $2 AND week_start_date = $3
      `, [tenant.id, userIds['bob@demo.com'], weekStart]);

      if (bobTimesheetExisting.rows.length === 0) {
        await client.query(`
          INSERT INTO timesheets (tenant_id, user_id, week_start_date, status, submitted_at, submitted_by_user_id, reviewed_at, reviewed_by_user_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          tenant.id,
          userIds['bob@demo.com'],
          weekStart,
          status,
          status !== 'draft' ? new Date() : null,
          status !== 'draft' ? userIds['bob@demo.com'] : null,
          status === 'approved' ? new Date() : null,
          status === 'approved' ? managerId : null,
        ]);
      } else {
        await client.query(`
          UPDATE timesheets
          SET status = $1, submitted_at = $2, submitted_by_user_id = $3, reviewed_at = $4, reviewed_by_user_id = $5
          WHERE tenant_id = $6 AND user_id = $7 AND week_start_date = $8
        `, [
          status,
          status !== 'draft' ? new Date() : null,
          status !== 'draft' ? userIds['bob@demo.com'] : null,
          status === 'approved' ? new Date() : null,
          status === 'approved' ? managerId : null,
          tenant.id,
          userIds['bob@demo.com'],
          weekStart,
        ]);
      }

      // Add time entries for Bob (only for approved/submitted weeks)
      if (status !== 'draft') {
        const kairosTaskResult = await client.query(`
          SELECT id FROM tasks WHERE tenant_id = $1 AND project_id = $2 AND name = 'Backend Development' LIMIT 1
        `, [tenant.id, projectIds['Kairos Platform']]);

        if (kairosTaskResult.rows.length > 0) {
          const taskId = kairosTaskResult.rows[0].id;

          // Mon-Fri: 8 hours each
          for (let day = 0; day < 5; day++) {
            const existingEntry = await client.query(`
              SELECT id FROM time_entries
              WHERE tenant_id = $1 AND user_id = $2 AND project_id = $3 AND task_id = $4
                AND week_start_date = $5 AND day_of_week = $6
            `, [tenant.id, userIds['bob@demo.com'], projectIds['Kairos Platform'], taskId, weekStart, day]);

            if (existingEntry.rows.length === 0) {
              await client.query(`
                INSERT INTO time_entries (tenant_id, user_id, project_id, task_id, week_start_date, day_of_week, hours, note)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              `, [tenant.id, userIds['bob@demo.com'], projectIds['Kairos Platform'], taskId, weekStart, day, 8, 'Backend API development']);
            } else {
              await client.query(`
                UPDATE time_entries
                SET hours = $1, note = $2
                WHERE tenant_id = $3 AND user_id = $4 AND project_id = $5 AND task_id = $6
                  AND week_start_date = $7 AND day_of_week = $8
              `, [8, 'Backend API development', tenant.id, userIds['bob@demo.com'], projectIds['Kairos Platform'], taskId, weekStart, day]);
            }
          }
        }
      }

      // Create timesheet for Carol
      const carolTimesheetExisting = await client.query(`
        SELECT id FROM timesheets WHERE tenant_id = $1 AND user_id = $2 AND week_start_date = $3
      `, [tenant.id, userIds['carol@demo.com'], weekStart]);

      if (carolTimesheetExisting.rows.length === 0) {
        await client.query(`
          INSERT INTO timesheets (tenant_id, user_id, week_start_date, status, submitted_at, submitted_by_user_id, reviewed_at, reviewed_by_user_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          tenant.id,
          userIds['carol@demo.com'],
          weekStart,
          status,
          status !== 'draft' ? new Date() : null,
          status !== 'draft' ? userIds['carol@demo.com'] : null,
          status === 'approved' ? new Date() : null,
          status === 'approved' ? managerId : null,
        ]);
      } else {
        await client.query(`
          UPDATE timesheets
          SET status = $1, submitted_at = $2, submitted_by_user_id = $3, reviewed_at = $4, reviewed_by_user_id = $5
          WHERE tenant_id = $6 AND user_id = $7 AND week_start_date = $8
        `, [
          status,
          status !== 'draft' ? new Date() : null,
          status !== 'draft' ? userIds['carol@demo.com'] : null,
          status === 'approved' ? new Date() : null,
          status === 'approved' ? managerId : null,
          tenant.id,
          userIds['carol@demo.com'],
          weekStart,
        ]);
      }

      console.log(`   ✓ Week ${weekStart}: ${status}`);
    }
    console.log('');

    // ===== 7. LEAVE REQUESTS =====
    console.log('7️⃣  Creating leave requests...');

    // Bob's pending vacation request (insert only if not exists)
    const bobRequest = await client.query(`
      SELECT id FROM benefit_requests
      WHERE tenant_id = $1 AND user_id = $2 AND start_date = $3 AND end_date = $4
    `, [tenant.id, userIds['bob@demo.com'], '2025-10-27', '2025-10-29']);

    if (bobRequest.rows.length === 0) {
      await client.query(`
        INSERT INTO benefit_requests (tenant_id, user_id, benefit_type_id, start_date, end_date, amount, status, note)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
      `, [
        tenant.id,
        userIds['bob@demo.com'],
        benefitTypeIds['vacation'],
        '2025-10-27',
        '2025-10-29',
        3,
        'Family vacation',
      ]);
    }
    console.log('   ✓ Bob: Pending vacation (Oct 27-29, 3 days)');

    // Carol's approved vacation
    const carolRequest = await client.query(`
      SELECT id FROM benefit_requests
      WHERE tenant_id = $1 AND user_id = $2 AND start_date = $3 AND end_date = $4
    `, [tenant.id, userIds['carol@demo.com'], '2025-11-10', '2025-11-12']);

    if (carolRequest.rows.length === 0) {
      await client.query(`
        INSERT INTO benefit_requests (tenant_id, user_id, benefit_type_id, start_date, end_date, amount, status, approver_user_id, approved_at, note)
        VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7, NOW(), $8)
      `, [
        tenant.id,
        userIds['carol@demo.com'],
        benefitTypeIds['vacation'],
        '2025-11-10',
        '2025-11-12',
        3,
        managerId,
        'Conference attendance',
      ]);
    }
    console.log('   ✓ Carol: Approved vacation (Nov 10-12, 3 days)');

    // Dave's pending sick leave
    const daveRequest = await client.query(`
      SELECT id FROM benefit_requests
      WHERE tenant_id = $1 AND user_id = $2 AND start_date = $3 AND end_date = $4
    `, [tenant.id, userIds['dave@demo.com'], '2025-10-22', '2025-10-22']);

    if (daveRequest.rows.length === 0) {
      await client.query(`
        INSERT INTO benefit_requests (tenant_id, user_id, benefit_type_id, start_date, end_date, amount, status, note)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
      `, [
        tenant.id,
        userIds['dave@demo.com'],
        benefitTypeIds['sick'],
        '2025-10-22',
        '2025-10-22',
        1,
        'Doctor appointment',
      ]);
    }
    console.log('   ✓ Dave: Pending sick day (Oct 22, 1 day)\n');

    // ===== 8. HOLIDAYS =====
    console.log('8️⃣  Creating holidays...');

    const holidays = [
      { date: '2025-11-28', name: 'Thanksgiving', country: 'US' },
      { date: '2025-12-25', name: 'Christmas Day', country: 'US' },
      { date: '2025-12-26', name: 'Boxing Day', country: 'US' },
      { date: '2026-01-01', name: 'New Year\'s Day', country: 'US' },
    ];

    for (const holiday of holidays) {
      const existing = await client.query(`
        SELECT id FROM holidays WHERE tenant_id = $1 AND date = $2
      `, [tenant.id, holiday.date]);

      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO holidays (tenant_id, country_code, date, name)
          VALUES ($1, $2, $3, $4)
        `, [tenant.id, holiday.country, holiday.date, holiday.name]);
      }
      console.log(`   ✓ ${holiday.name} (${holiday.date})`);
    }

    console.log('\n✅ Demo data seed completed successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 DEMO CREDENTIALS (Password: Password123! for all)');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Tenant ID: ${tenant.id}`);
    console.log(`Tenant Slug: ${tenant.slug}\n`);

    console.log('Users:');
    for (const [email, id] of Object.entries(userIds)) {
      console.log(`  ${email}`);
      console.log(`    ID: ${id}`);
    }

  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
