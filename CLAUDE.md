# CLAUDE.md

Project: Kairos Backend  
Stack: NestJS + TypeScript + PostgreSQL 16 (Docker)  
Runtime: Node 22  

Goal: Provide a simple, clean REST API. No authentication yet. Focus on correctness, clarity, and maintainability.

The API must use **Drizzle ORM** for database access and migrations.  
The SQL in /referenceDBTABLES is the source of truth; Drizzle is only for queries, migrations, and type-safety.

Note: The database schema reference is located at /referenceDBTABLES/01_script_db_reference.sql.  
This file mirrors the live schema from the actual database.

---

## Context

- Framework: NestJS (REST)
- Database: PostgreSQL 16
- Scope: CRUD endpoints for projects, tasks, time_entries, benefit_types, benefit_requests, holidays, timesheet_policies.
- Out of scope: users, memberships, authentication, multi-tenancy logic.

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

- The SQL in /init is canonical. Never modify structure silently.
- Use parameterized queries only.
- Add indexes for frequent filters.
- RLS can remain disabled until auth is implemented.
- Do not expose internal IDs or stack traces in production.

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

## Don’ts

- Do not add authentication yet.
- Do not add new libraries unless necessary.
- Do not change enums or RLS without explanation.
- Do not modify unrelated modules when fixing or adding features.

---

## Prompt Patterns

Add module:
"Create holidays CRUD (list, get, create, update, delete)."

Add pagination:
"Add ?page, ?limit, and ?sort to GET /projects."

Add database change:
"Add index on time_entries(tenant_id, user_id, week_start_date)."

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