# 🚨 MIGRATION REQUIRED: Extended Project Metadata

**Date:** November 2025
**Priority:** HIGH
**Status:** Migration 0008 must be applied before projects endpoints will work

---

## ⚡ Quick Fix (30 seconds)

```bash
# Run this command from project root:
pnpm db:migrate
```

**Done!** The projects endpoint should now work.

---

## 🔍 What This Does

Adds 7 new columns to the `projects` table:
1. `description` - Project description (text)
2. `start_date` - Project start date
3. `end_date` - Project end date
4. `client_name` - Client/customer name
5. `budget_hours` - Budget in hours (decimal)
6. `created_at` - Creation timestamp
7. `updated_at` - Last modified timestamp

---

## ❌ If Migration Fails

Run these SQL commands directly:

```bash
docker exec -it <postgres-container> psql -U admin -d kairos
```

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_hours numeric(10, 2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now() NOT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now() NOT NULL;
```

---

## ✅ Verify It Worked

```bash
# Check the schema
docker exec <container> psql -U admin -d kairos -c "\d projects"

# You should see 12 columns total (5 original + 7 new)
```

---

## 🧪 Test After Migration

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@demo.com","password":"password123"}'

# Get projects (use session token from above)
curl http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer <session-token>"

# Expected: 200 OK with projects including new metadata fields
```

---

## 📚 More Details

See [TROUBLESHOOTING_500_ERROR.md](./docs/TROUBLESHOOTING_500_ERROR.md) for comprehensive guide.

---

## 🎯 Why This Is Happening

The code was updated to support extended project metadata, but the database schema hasn't been updated yet. The migration file exists (`drizzle/migrations/0008_last_gauntlet.sql`) but hasn't been executed.

**Current State:**
- ✅ Code updated
- ✅ Migration file generated
- ❌ Migration not applied to database
- ❌ Database missing 7 columns

**After Migration:**
- ✅ All columns present
- ✅ API returns extended metadata
- ✅ Frontend can display rich project information
