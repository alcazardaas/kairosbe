# CLAUDE.md

Project: Kairos Backend
Stack: NestJS + TypeScript + PostgreSQL 16 (Docker)
Runtime: Node 22

Goal: Provide a simple, clean REST API with authentication and multi-tenancy support. Focus on correctness, clarity, and maintainability.

The API must use **Drizzle ORM** for database access and migrations.
The SQL in /referenceDBTABLES is the source of truth; Drizzle is only for queries, migrations, and type-safety.

Note: The database schema reference is located at /referenceDBTABLES/01_script_db_reference.sql.
This file mirrors the live schema from the actual database.

---

## Context

- Framework: NestJS (REST)
- Database: PostgreSQL 16
- Scope: Full-featured timesheet and PTO management system with auth, multi-tenancy, and approval workflows
- Current implementation: CRUD endpoints for projects, tasks, time_entries, benefit_types, holidays, timesheet_policies
- In progress: Authentication, sessions, timesheet lifecycle, project membership, PTO workflows

---

## Core Principles

1. Keep modules small and explicit.
2. Do not abstract prematurely.
3. Database schema in /init is the source of truth.
4. Always explain what changed, why, and how to test it.
5. Consistency and clarity are more important than brevity.

---

## Technical Standards

| Area | Rule |
|------|------|
| Package manager | pnpm |
| Validation | zod schemas (DTOs) |
| Lint / Format | ESLint + Prettier |
| Logging | nestjs-pino |
| Testing | vitest + supertest |
| DB Layer | drizzle-orm or pg (typed) |
| Migrations | drizzle-kit |
| Base path | /api/v1 |
| Env vars | DATABASE_URL, PORT, LOG_LEVEL, etc. |

---

## Project Structure

kairosbe/
  src/
    app.module.ts
    db/
    common/
    projects/
    tasks/
    time-entries/
    benefit-types/
    holidays/
    timesheet-policies/
  docker-compose.yml
  package.json
  .env.example

---

## API Rules

- Use plural nouns: /projects, /time-entries
- Pagination: ?page=1&limit=20 (defaults: page=1, limit=20)
- Sorting: ?sort=created_at:desc
- Response:
  {
    "data": [],
    "meta": { "page": 1, "limit": 20, "total": 42 }
  }
- Errors: { "error": "...", "message": "...", "statusCode": 400 }
- Dates: ISO 8601 UTC
- Validation: handled by ZodValidationPipe

---

## Database Rules

- The SQL in /referenceDBTABLES is canonical. Never modify structure silently.
- Use parameterized queries only.
- Add indexes for frequent filters.
- RLS enforcement will be enabled as part of auth implementation.
- Do not expose internal IDs or stack traces in production.
- Sessions are stored in database for security and scalability.

---

## Claude Behavior

When generating code or explanations:

1. Start with a short summary of decisions.
2. Show only files affected and their full content.
3. Include commands to run (pnpm, migrations, etc.).
4. Include how to verify or test.
5. Keep changes small and atomic.

If unsure, ask clear questions before proceeding.

---

## Don'ts

- Do not add new libraries unless necessary.
- Do not change enums or RLS without explanation.
- Do not modify unrelated modules when fixing or adding features.
- Do not expose password hashes or session tokens in API responses.
- Do not store sensitive data in JWTs (keep tokens opaque).

---

## Prompt Patterns

Add module:
"Create holidays CRUD (list, get, create, update, delete)."

Add pagination:
"Add ?page, ?limit, and ?sort to GET /projects."

Add database change:
"Add index on time_entries(tenant_id, user_id, week_start_date)."

---

## Implementation Roadmap

The following features are being implemented in order:

### 1. Auth & Session (In Progress)

- POST /auth/login - Email/password authentication
- POST /auth/refresh - Refresh session token
- POST /auth/logout - Invalidate session
- GET /me - Current user context (user, tenant, role, permissions)
- (Optional) POST /tenants/switch - Switch active tenant context
- Session TTL configurable via environment variable (default: 30 days)

### 2. Timesheet Lifecycle

- GET /timesheets?user_id&week_start - List timesheets
- POST /timesheets - Create draft timesheet
- POST /timesheets/:id/submit - Submit for approval
- POST /timesheets/:id/approve - Approve timesheet
- POST /timesheets/:id/reject - Reject with reason
- GET /timesheets/:id - Get timesheet with line items (time entries)

### 3. Project Access & Membership

- GET /projects/:id/members - List project members
- POST /projects/:id/members - Assign user to project
- DELETE /projects/:id/members/:user_id - Remove member
- GET /my/projects - Projects current user can log time to

### 4. PTO Balances & Leave Requests

- GET /users/:id/benefits - User's benefit balances
- GET /leave-requests?mine=true|team=true&status=pending - List requests
- POST /leave-requests - Create leave request
- PATCH /leave-requests/:id - Update request
- POST /leave-requests/:id/approve - Approve request
- POST /leave-requests/:id/reject - Reject request

### 5. Policy Surface for Frontend Boot

- Extend GET /me to include tenant's timesheet_policy
- Frontend can configure week grid based on policy

### 6. Search Helpers (UX)

- GET /search/projects?q= - Search projects by name/code
- GET /search/tasks?project_id=&q= - Search tasks with optional project filter

---

## Authentication & Authorization

### Session Management

- Sessions stored in database (sessions table)
- Session tokens are opaque UUIDs, not JWTs
- Session TTL is long-lived (configurable, default 30 days)
- Refresh tokens rotate on use
- Logout invalidates session immediately

### Multi-Tenancy

- Users can belong to multiple tenants via memberships
- Each session is scoped to one active tenant
- RLS policies enforce tenant isolation at database level
- set_config('app.tenant_id', ...) called per request

### Authorization

- Role-based: admin, manager, employee
- Permissions derived from role and membership status
- Guards check role + tenant membership before allowing operations

---

## Commit Checklist

- Lint and build pass.
- DTOs validate inputs.
- Unit and e2e tests pass.
- SQL is safe and parameterized.
- Correct HTTP status codes used.
- Example curl commands work.
- Documentation updated if needed.

---

End of file