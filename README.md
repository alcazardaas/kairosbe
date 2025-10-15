# Kairos Backend

A clean REST API backend built with NestJS, TypeScript, and PostgreSQL 16.

**Stack:**
- NestJS (REST framework)
- TypeScript
- PostgreSQL 16
- Drizzle ORM (type-safe queries + migrations)
- Pino (structured logging)
- Zod (validation)
- Vitest (testing)

**Runtime:** Node 22

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16 database running (see Database section)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database credentials
```

### Running the Application

```bash
# Development mode with hot reload
pnpm dev

# Production build
pnpm build
pnpm start:prod

# Lint
pnpm lint

# Run tests
pnpm test
```

### Verify Installation

```bash
# Test health endpoint
curl http://localhost:3000/api/v1/health
# Expected: {"ok":true,"ts":"...","database":"connected"}
```

---

## Database Setup

**This project requires an external PostgreSQL 16 database.**

The database is managed in a separate project and should already be running. This backend application only connects to the database; it does not manage or start it.

### Database Prerequisites

- PostgreSQL 16 database running (managed externally, e.g., via the `kairosdb` project)
- Database schema already initialized from `/referenceDBTABLES/01_script_db_reference.sql`

### Connection Configuration

Set `DATABASE_URL` in your `.env` file to point to your external database:

```bash
DATABASE_URL=postgresql://admin:admin@localhost:5432/kairos
```

Adjust the credentials and connection string to match your external database configuration.

### About Drizzle ORM

**Drizzle ORM** is used in this project for:

- Type-safe database queries
- Schema definitions (in `src/db/schema/`)
- Future schema migrations

**Important:** The initial schema should already exist in your external database. Drizzle provides the typed interface and migration capabilities for future schema changes.

### Drizzle Commands

```bash
# Generate a new migration (after schema changes)
pnpm db:generate

# Run migrations (applies changes to the external database)
pnpm db:migrate

# Open Drizzle Studio (GUI for browsing database)
pnpm db:studio
```

---

## Project Structure

```
kairosbe/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   ├── db/
│   │   ├── db.module.ts           # Database module
│   │   ├── db.service.ts          # Database service (Drizzle connection)
│   │   ├── migrate.ts             # Migration runner script
│   │   └── schema/                # Drizzle schema definitions
│   │       ├── index.ts
│   │       ├── enums.ts
│   │       ├── tenants.ts
│   │       ├── users.ts
│   │       ├── memberships.ts
│   │       ├── benefits.ts
│   │       ├── projects.ts
│   │       ├── time-entries.ts
│   │       ├── holidays.ts
│   │       ├── timesheet-policies.ts
│   │       └── audit.ts
│   ├── common/                    # Shared utilities
│   ├── health/                    # Health check endpoint
│   ├── projects/                  # Projects CRUD (TODO)
│   ├── tasks/                     # Tasks CRUD (TODO)
│   ├── time-entries/              # Time entries CRUD (TODO)
│   ├── benefit-types/             # Benefit types CRUD (TODO)
│   ├── holidays/                  # Holidays CRUD (TODO)
│   └── timesheet-policies/        # Timesheet policies CRUD (TODO)
├── drizzle/
│   └── migrations/                # Drizzle migration files
├── referenceDBTABLES/
│   └── 01_script_db_reference.sql # Database schema reference
├── .env.example                   # Environment variables template
├── drizzle.config.ts              # Drizzle configuration
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── CLAUDE.md                      # Project rules and conventions
```

---

## API Conventions

All endpoints are prefixed with `/api/v1`.

### Standard Response Format

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

### Pagination & Sorting

- `?page=1&limit=20` (defaults: page=1, limit=20)
- `?sort=created_at:desc`

### Error Format

```json
{
  "error": "...",
  "message": "...",
  "statusCode": 400
}
```

### Dates

All dates are in ISO 8601 UTC format.

---

## Available Endpoints

### Health Check

```bash
GET /api/v1/health
```

Returns server and database status.

**Example:**
```bash
curl http://localhost:3000/api/v1/health
```

---

## Development Guidelines

See [CLAUDE.md](./CLAUDE.md) for complete project rules and conventions.

**Key principles:**
1. Keep modules small and explicit
2. Don't abstract prematurely
3. Database schema in `/referenceDBTABLES` is the source of truth
4. Always explain what changed, why, and how to test it
5. Consistency and clarity over brevity

**Technical standards:**
- Use pnpm for package management
- Validate inputs with Zod schemas (DTOs)
- Use ESLint + Prettier for code quality
- Write tests with Vitest
- Use Drizzle ORM for database access
- Log with nestjs-pino

---

## Implementation Status

**✅ Completed Modules:**
- ✅ **Projects** - Full CRUD with pagination, sorting, filtering
- ✅ **Tasks** - Hierarchical CRUD with circular reference prevention
- ✅ **Time Entries** - Time tracking with statistics endpoints
- ✅ **Benefit Types** - PTO/vacation type management
- ✅ **Holidays** - Company/country holiday management
- ✅ **Timesheet Policies** - Tenant-specific timesheet configuration

**Total Endpoints:** 34
- Health: 1
- Projects: 5
- Tasks: 5
- Time Entries: 7 (including 2 stats endpoints)
- Benefit Types: 5
- Holidays: 5
- Timesheet Policies: 5

**In Progress:**

### 1. Auth & Session

- POST /auth/login (email/password)
- POST /auth/refresh (refresh session token)
- POST /auth/logout (invalidate session)
- GET /me (user context: user, tenant, role, permissions)
- POST /tenants/switch (optional: switch active tenant)
- Session TTL: configurable via env (default: 30 days)

### 2. Timesheet Lifecycle

- GET /timesheets?user_id&week_start
- POST /timesheets (create draft)
- POST /timesheets/:id/submit
- POST /timesheets/:id/approve
- POST /timesheets/:id/reject
- GET /timesheets/:id (includes time entries)

### 3. Project Access & Membership

- GET /projects/:id/members
- POST /projects/:id/members (assign user)
- DELETE /projects/:id/members/:user_id
- GET /my/projects (projects user can log to)

### 4. PTO Balances & Leave Requests

- GET /users/:id/benefits (benefit balances)
- GET /leave-requests?mine=true|team=true&status=pending
- POST /leave-requests (create)
- PATCH /leave-requests/:id
- POST /leave-requests/:id/approve
- POST /leave-requests/:id/reject

### 5. Policy Surface for Frontend Boot

- Extend GET /me to include tenant's timesheet_policy
- Frontend configures week grid based on policy

### 6. Search Helpers (UX)

- GET /search/projects?q= (name/code search)
- GET /search/tasks?project_id=&q= (task search)

**Future features:**

- Multi-tenancy with full RLS enforcement
- Benefit policies and balances management
- Comprehensive test coverage (unit + e2e)
- API documentation (Swagger/OpenAPI)

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm start:prod` | Start production server |
| `pnpm lint` | Run ESLint with auto-fix |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run tests with Vitest |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:cov` | Run tests with coverage |
| `pnpm db:generate` | Generate new Drizzle migration |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Drizzle Studio GUI |

---

## Environment Variables

See `.env.example` for all available environment variables:

- `NODE_ENV` - Environment (development, production)
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_TTL` - Session lifetime in seconds (default: 2592000 = 30 days)
- `SESSION_SECRET` - Secret key for signing session tokens (required in production)
- `REFRESH_TOKEN_TTL` - Refresh token lifetime in seconds (default: 7776000 = 90 days)

---

## License

UNLICENSED - Private project
