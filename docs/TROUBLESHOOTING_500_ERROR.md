# Troubleshooting: 500 Error on GET /api/v1/projects

**Issue:** GET request to `/api/v1/projects` returns 500 Internal Server Error

**Root Cause:** Database migration 0008 not applied - extended metadata columns don't exist in the database yet.

---

## Quick Fix

### Option 1: Apply Migration (Recommended)

```bash
# From project root
pnpm db:migrate
```

**Expected Output:**
```
🚀 Running migrations...
📦 Database: postgresql://admin:****@localhost:5432/kairos
✅ Migrations applied successfully
```

---

### Option 2: Manual Migration (If Option 1 Fails)

If the migration fails with enum type errors, apply the columns manually:

```bash
# Find your PostgreSQL container
docker ps | grep postgres

# Connect to database
docker exec -it <container-name> psql -U admin -d kairos

# Run these SQL commands:
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_hours numeric(10, 2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now() NOT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now() NOT NULL;

# Verify columns were added:
\d projects

# Exit psql:
\q
```

---

## Verification Steps

### 1. Check Database Schema

```bash
docker exec <container-name> psql -U admin -d kairos -c "\d projects"
```

**Expected Output:**
```
                                    Table "public.projects"
     Column     |           Type           | Collation | Nullable |      Default
----------------+--------------------------+-----------+----------+-------------------
 id             | uuid                     |           | not null | gen_random_uuid()
 tenant_id      | uuid                     |           | not null |
 name           | text                     |           | not null |
 code           | text                     |           |          |
 active         | boolean                  |           | not null | true
 description    | text                     |           |          |    ← NEW
 start_date     | date                     |           |          |    ← NEW
 end_date       | date                     |           |          |    ← NEW
 client_name    | text                     |           |          |    ← NEW
 budget_hours   | numeric(10,2)            |           |          |    ← NEW
 created_at     | timestamp with time zone |           | not null | now()  ← NEW
 updated_at     | timestamp with time zone |           | not null | now()  ← NEW
```

### 2. Test the Endpoint

```bash
# Login to get session token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@demo.com","password":"password123"}'

# Use the session token to get projects
curl http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer <session-token>"
```

**Expected:** 200 OK with JSON response containing projects with extended metadata

### 3. Check Backend Logs

If still failing, check the backend logs for detailed error messages:

```bash
# If running with pnpm dev
# Check terminal output for errors

# Look for PostgreSQL errors like:
# "column projects.description does not exist"
# "column projects.start_date does not exist"
```

---

## Understanding the Issue

### What Happened

1. **Code Change:** Extended metadata fields were added to the Drizzle schema (`src/db/schema/projects.ts`)
2. **Migration Generated:** Migration file `drizzle/migrations/0008_last_gauntlet.sql` was created
3. **Migration NOT Applied:** The migration was never executed on the development database
4. **Result:** Code expects columns that don't exist → PostgreSQL error → 500 response

### Why It's a 500 Error

When the backend tries to execute:
```typescript
const data = await db
  .select()
  .from(projects)
  .where(...)
```

Drizzle generates SQL like:
```sql
SELECT id, tenant_id, name, code, active,
       description, start_date, end_date,
       client_name, budget_hours, created_at, updated_at
FROM projects
WHERE ...
```

PostgreSQL responds with:
```
ERROR: column "description" does not exist
```

This database error is caught by NestJS and returned as a generic 500 Internal Server Error.

---

## Files Involved

### Migration File
- **Location:** `drizzle/migrations/0008_last_gauntlet.sql`
- **Content:** ALTER TABLE statements to add 7 new columns
- **Status:** Created but not executed

### Schema File
- **Location:** `src/db/schema/projects.ts`
- **Status:** Already updated with new fields
- **Issue:** Database doesn't match schema yet

### Reference Schema
- **Location:** `referenceDBTABLES/01_script_db_reference.sql`
- **Lines 138-150:** Shows complete schema including new fields

---

## Prevention

To avoid this issue in the future:

1. **Always run migrations after pulling changes:**
   ```bash
   git pull
   pnpm db:migrate
   ```

2. **Check if migrations are pending:**
   ```bash
   # List all migrations
   ls -la drizzle/migrations/

   # Check last applied migration in database
   docker exec <container> psql -U admin -d kairos -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
   ```

3. **Verify schema matches code:**
   ```bash
   # Compare actual DB schema with reference
   docker exec <container> psql -U admin -d kairos -c "\d projects" > /tmp/actual_schema.txt
   cat referenceDBTABLES/01_script_db_reference.sql | grep -A 20 "CREATE TABLE.*projects"
   ```

---

## Common Errors During Migration

### Error 1: Enum Type Already Exists
```
ERROR: type "accrual_method_enum" already exists
```

**Solution:** This is a known issue with Drizzle migrations. Use Option 2 (Manual Migration) instead.

### Error 2: Permission Denied
```
ERROR: permission denied for table projects
```

**Solution:** Ensure you're connecting as the admin user:
```bash
docker exec -it <container> psql -U admin -d kairos
```

### Error 3: Database Connection Failed
```
error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:** Ensure PostgreSQL container is running:
```bash
docker ps | grep postgres
# If not running:
docker-compose up -d
```

---

## After Migration: What Changes

### API Responses Now Include

All project endpoints now return extended metadata:

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "Website Redesign",
  "code": "WEB-001",
  "active": true,

  // NEW FIELDS:
  "description": "Complete redesign of the company website",
  "startDate": "2025-11-01",
  "endDate": "2026-02-28",
  "clientName": "Acme Corporation",
  "budgetHours": "500.00",
  "createdAt": "2025-11-04T10:30:00.000Z",
  "updatedAt": "2025-11-04T10:30:00.000Z"
}
```

### Seed Data

After migration, run the seed script to populate projects with realistic metadata:

```bash
pnpm tsx src/db/seed-manager-team.ts
```

This will create 4 demo projects with:
- Descriptions
- Timeline dates
- Client names
- Budget hours

---

## Support

If issues persist after following this guide:

1. **Check backend logs** for specific error messages
2. **Verify database connection** is working
3. **Ensure migrations table exists** in the database
4. **Contact DevOps** if database permissions are an issue

---

## Summary

✅ **Problem:** Extended metadata columns don't exist in database
✅ **Cause:** Migration 0008 not applied
✅ **Solution:** Run `pnpm db:migrate` or apply columns manually
✅ **Verification:** Check schema with `\d projects` in psql
✅ **Test:** GET /api/v1/projects should return 200 OK

**Status after fix:** All 13 project management endpoints will work correctly with extended metadata support.
