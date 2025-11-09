# CLAUDE.md

Project: Kairos Backend
Stack: NestJS + TypeScript + PostgreSQL 16 (Docker)
Runtime: Node 22

Goal: Provide a production-ready REST API for timesheet and PTO management with authentication, multi-tenancy, and approval workflows. Focus on correctness, clarity, and maintainability.

The API uses **Drizzle ORM** for database access and migrations.
The SQL in /referenceDBTABLES is the source of truth; Drizzle provides type-safety and migration tooling.

Note: The database schema reference is located at /referenceDBTABLES/01_script_db_reference.sql.
This file mirrors the live schema from the actual database.

---

## Context

- Framework: NestJS (REST API)
- Database: PostgreSQL 16 with RLS (Row Level Security)
- ORM: Drizzle ORM
- Authentication: Session-based (database-backed)
- Multi-tenancy: Full tenant isolation via RLS
- Status: **Production-ready** - All 7 implementation phases complete

### Implemented Features

**✅ Complete Feature Set:**
- Authentication & session management
- Weekly timesheet grid with bulk operations
- Timesheet submission & approval workflow
- Project & task management
- Project membership tracking
- PTO/Leave request management with balances
- Manager team views & calendar
- Organization & user management
- Dashboard analytics endpoints
- Search & filtering helpers
- Holiday management
- Timesheet policy configuration

**Total Endpoints:** 71 (see docs/USER_STORIES_COMPLETE.md)

---

## Core Principles

1. Keep modules small and explicit.
2. Do not abstract prematurely.
3. Always explain what changed, why, and how to test it.
4. Consistency and clarity are more important than brevity.

---

## Technical Standards

| Area | Rule |
|------|------|
| Package manager | pnpm |
| Validation | zod schemas (DTOs) |
| Lint / Format | ESLint + Prettier |
| Logging | nestjs-pino (structured JSON logs) |
| Testing | vitest + supertest |
| DB Layer | drizzle-orm + pg (typed queries) |
| Migrations | drizzle-kit |
| Base path | /api/v1 |
| Env vars | DATABASE_URL, PORT, LOG_LEVEL, SESSION_SECRET, etc. |

---

## Naming Conventions

**CRITICAL: Maintain strict separation between API and database naming:**

### API Layer (camelCase)
All external-facing JSON (requests, responses, DTOs) use **camelCase**:
- Request DTOs (zod schemas): `userId`, `weekStartDate`, `projectId`
- Response DTOs (@ApiProperty): `createdAt`, `updatedAt`, `timeEntries`
- Query parameters: `?userId=...&weekStartDate=...`
- JSON payloads: `{ "userId": "...", "dayOfWeek": 0 }`

### Database Layer (snake_case)
All SQL and database schemas use **snake_case**:
- Column names: `user_id`, `week_start_date`, `project_id`
- Table names: `time_entries`, `leave_requests`, `project_members`
- SQL queries: `WHERE user_id = $1 AND week_start_date = $2`

### TypeScript Code (camelCase)
All TypeScript identifiers use **camelCase**:
- Variables: `const userId = ...`
- Functions: `function getUserById() { ... }`
- Class methods: `async findByUserId() { ... }`

### Transformation Pattern

**Services handle transformation between layers:**

```typescript
// Service receives DTO (camelCase)
async create(tenantId: string, dto: CreateTimeEntryDto) {
  // Transform to snake_case for database
  const dbData = transformKeysToSnake(dto);

  // Insert into database
  const result = await db.insert(timeEntries).values(dbData);

  // Transform result back to camelCase for API response
  return transformKeysToCamel(result);
}
```

**Use transformation helpers:**
- `transformKeysToCamel(obj)` - Convert DB results → API responses
- `transformKeysToSnake(obj)` - Convert API requests → DB queries
- Located in: `src/common/helpers/case-transform.helper.ts`

### Common Field Mappings

| Database (snake_case) | API (camelCase) |
|-----------------------|-----------------|
| `tenant_id` | `tenantId` |
| `user_id` | `userId` |
| `project_id` | `projectId` |
| `task_id` | `taskId` |
| `week_start_date` | `weekStartDate` |
| `day_of_week` | `dayOfWeek` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `time_entries` | `timeEntries` |
| `leave_requests` | `leaveRequests` |
| `parent_task_id` | `parentTaskId` |
| `manager_user_id` | `managerUserId` |
| `country_code` | `countryCode` |
| `is_recurring` | `isRecurring` |
| `requires_approval` | `requiresApproval` |
| `page_size` | `pageSize` |

### Why This Matters

- **Consistency**: JavaScript/TypeScript community uses camelCase
- **SQL Convention**: Database world uses snake_case
- **Clear Boundaries**: Transformation happens at service layer
- **Type Safety**: DTOs match API contract, not DB schema
- **Documentation**: OpenAPI specs show camelCase (developer-friendly)

---

## Project Structure

```
kairosbe/
  src/
    main.ts                      # Application entry
    app.module.ts                # Root module
    db/
      db.module.ts               # Database module
      db.service.ts              # Drizzle connection
      schema/                    # Schema definitions
      seed-*.ts                  # Seed scripts
    common/                      # Shared utilities, pipes
      audit/                     # Audit logging service
      config/                    # Configuration (multer, etc.)
      helpers/                   # Transformation helpers
    auth/                        # Authentication & sessions
    timesheets/                  # Timesheet lifecycle
    time-entries/                # Time entry CRUD + stats
    projects/                    # Project management
    tasks/                       # Task management
    my-projects/                 # User project assignments
    leave-requests/              # PTO/leave management
    benefit-types/               # Benefit type configuration
    holidays/                    # Holiday calendar
    timesheet-policies/          # Timesheet policy config
    users/                       # User management (admin)
      services/                  # User import service
    organization/                # Organization settings
    calendar/                    # Unified calendar feed
    search/                      # Search helpers
    health/                      # Health check
  docs/                          # API documentation
    USER_STORIES_COMPLETE.md     # Complete feature reference
    FRONTEND_API_REFERENCE.md    # Frontend integration guide
    DASHBOARD_API_SPEC.md        # Dashboard endpoints
    MANAGER_TEAM_VIEWS.md        # Manager features
    BULK_USER_IMPORT_SPEC.md     # Bulk import specification
    FRONTEND_BULK_IMPORT_GUIDE.md # Frontend bulk import guide
    API_*.md                     # Feature-specific docs
  postman/                       # Postman collections
  referenceDBTABLES/             # Database schema source
  docker-compose.yml             # PostgreSQL 16 container
  .env.example
```

---

## API Rules

### Endpoints
- Use plural nouns: `/projects`, `/time-entries`
- Version prefix: `/api/v1`
- RESTful conventions: GET (list/read), POST (create), PATCH (update), DELETE (delete)

### Pagination
- Query params: `?page=1&limit=20`
- Defaults: page=1, limit=20, max=100
- Response includes meta: `{ page, limit, total }`

### Sorting
- Query param: `?sort=field:asc|desc`
- Example: `?sort=created_at:desc`

### Filtering
- Use query parameters for filters
- Date ranges: `?from=2025-01-01&to=2025-12-31`
- Status filters: `?status=pending`
- Boolean flags: `?team=true&mine=false`

### Response Format
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

### Error Format
```json
{
  "error": "Bad Request",
  "message": "Validation failed: email is required",
  "statusCode": 400
}
```

### Dates
- All dates in ISO 8601 format (YYYY-MM-DD or full ISO datetime)
- Timezone: UTC
- Week start day configurable per tenant

### Validation
- All inputs validated via ZodValidationPipe
- DTOs use zod schemas
- Clear error messages returned

---

## Database Rules

- The SQL in /referenceDBTABLES is canonical. Never modify structure silently.
- Use parameterized queries only (SQL injection prevention).
- Add indexes for frequent filters and joins.
- RLS (Row Level Security) enforces tenant isolation.
- Do not expose internal IDs or stack traces in production.
- Sessions stored in database for security and scalability.
- All timestamps in UTC.

### Performance
- Composite indexes on common filter patterns
- Pagination required for large result sets
- Connection pooling via pg pool

---

## Authentication & Authorization

### Session Management
- Sessions stored in database (`sessions` table)
- Session tokens are opaque UUIDs, not JWTs
- Default TTL: 30 days (configurable via SESSION_TTL env var)
- Refresh tokens rotate on use (TTL: 90 days)
- Logout invalidates session immediately

### Multi-Tenancy & Tenant Handling

**IMPORTANT: Tenant ID is NEVER sent by the frontend in request parameters or body.**

#### How Tenant Context Works

1. **Session Binding:**
   - Users can belong to multiple tenants via `memberships` table
   - Each session is scoped to **exactly one active tenant**
   - Tenant ID is stored in the `sessions` table alongside user ID
   - When user logs in, they can optionally specify which tenant to use
   - If not specified, the first active membership is used

2. **Automatic Tenant Extraction:**
   - `AuthGuard` validates session token on every request
   - Tenant ID is extracted from the session and attached to `request.tenantId`
   - Controllers use `@CurrentTenantId()` decorator to inject tenant ID
   - **Frontend NEVER needs to send tenant_id in URLs, query params, or request bodies**

3. **Pattern Used in ALL Controllers:**
   ```typescript
   @Get()
   async findAll(@CurrentTenantId() tenantId: string) {
     return this.service.findAll(tenantId);
   }

   @Post()
   async create(
     @CurrentTenantId() tenantId: string,
     @Body() createDto: CreateDto
   ) {
     return this.service.create(tenantId, createDto);
   }
   ```

4. **Service Layer Pattern:**
   - All service methods receive `tenantId` as **first parameter**
   - Services apply tenant filtering in database queries
   - Example: `async findAll(tenantId: string, userId: string, filters?: Filters)`

5. **Database Isolation:**
   - RLS policies enforce tenant isolation at database level
   - `set_config('app.tenant_id', ...)` called per request
   - All queries automatically scoped to session's tenant
   - Even if tenant_id is wrong in code, RLS prevents cross-tenant access

#### Frontend Implementation

**✅ Correct Pattern:**
```typescript
// Login - receive and store tenant_id
const { sessionToken, tenantId, userId } = await login(email, password);
localStorage.setItem('sessionToken', sessionToken);
localStorage.setItem('tenantId', tenantId);  // For display only

// All subsequent requests - ONLY send session token
fetch('/api/v1/timesheets', {
  headers: { 'Authorization': `Bearer ${sessionToken}` }
  // NO tenant_id in URL, query params, or body!
});
```

**❌ Wrong Pattern:**
```typescript
// DON'T send tenant_id in URLs or body
fetch(`/api/v1/timesheets/${tenantId}`);  // ❌ Wrong
fetch('/api/v1/timesheets', {
  body: JSON.stringify({ tenant_id: tenantId, ... })  // ❌ Wrong
});
```

#### Tenant Switching

If a user belongs to multiple tenants and wants to switch:
```typescript
// Re-login with different tenant_id
await login(email, password, { tenantId: newTenantId });
// New session created with new tenant context
```

#### When Tenant ID IS Available to Frontend

Frontend receives `tenantId` in two places:
1. **Login response:** `POST /api/v1/auth/login` returns `{ sessionToken, tenantId, userId, ... }`
2. **Session info:** `GET /api/v1/auth/me` returns `{ user, tenant: { id }, membership, ... }`

Use this tenant_id for:
- Display purposes (show which org user is logged into)
- Multi-tenant switching UI (if user has multiple memberships)
- Client-side caching/state management keys

**DO NOT use tenant_id in API requests** - backend gets it from session automatically.

### Authorization (RBAC)
- Three roles: **admin**, **manager**, **employee**
- Permissions derived from role and membership status
- Guards check role + tenant membership before operations
- Manager-employee relationship via `profiles.manager_user_id`

**Role Capabilities:**
- **Employee**: Log time, submit timesheets, request leave
- **Manager**: All employee capabilities + approve team timesheets/leave
- **Admin**: All manager capabilities + user management, org settings, configuration

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
- Do not skip validation on user inputs.
- Do not create N+1 query problems (use joins or eager loading).
- **Do not add tenant_id as a route parameter (e.g., `/:tenantId`) or expect it in request bodies** - always use `@CurrentTenantId()` decorator.
- **Do not break the tenant handling pattern** - all controllers must use `@CurrentTenantId()` to extract tenant from session.

---

## Prompt Patterns

Add module:
"Create a new module for X with CRUD operations."

Add pagination:
"Add pagination support to GET /endpoint with page, limit, and sort."

Add database change:
"Add composite index on table(field1, field2, field3) for common query pattern."

Add endpoint:
"Create POST /endpoint with validation and error handling."

---

## Implementation Status

### ✅ All 7 Phases Complete

#### Phase 1: Auth & Session Management ✅
- POST `/auth/login` - Email/password authentication
- POST `/auth/refresh` - Refresh session token
- POST `/auth/logout` - Invalidate session
- GET `/auth/me` - Current user context (user, tenant, role, permissions, timesheetPolicy)
- Session TTL configurable via environment variable

#### Phase 2: Timesheet Lifecycle ✅
- GET `/timesheets?user_id&week_start&status&team=true` - List timesheets with team filtering
- GET `/timesheets/:id` - Get timesheet with time entries
- GET `/timesheets/my-current` - Get/create current week timesheet
- POST `/timesheets` - Create draft timesheet
- POST `/timesheets/:id/submit` - Submit for approval
- POST `/timesheets/:id/approve` - Approve timesheet (manager)
- POST `/timesheets/:id/reject` - Reject with reason (manager)
- POST `/timesheets/:id/recall` - Recall submitted timesheet
- POST `/timesheets/:id/validate` - Validate against policy rules
- DELETE `/timesheets/:id` - Delete draft only

#### Phase 3: Time Entry Management ✅
- GET `/time-entries/week/:userId/:weekStartDate` - Week view with aggregations
- POST `/time-entries` - Create single entry (with validation)
- POST `/time-entries/bulk` - Bulk create/update entries
- POST `/time-entries/copy-week` - Copy previous week
- PATCH `/time-entries/:id` - Update entry (hours/note only)
- DELETE `/time-entries/:id` - Delete entry
- GET `/time-entries/stats/weekly/:userId/:weekStartDate` - Weekly statistics
- GET `/time-entries/stats/user-projects/:userId` - Project distribution

#### Phase 4: Project Access & Membership ✅
- GET `/projects` - List projects (CRUD)
- POST `/projects` - Create project
- GET `/projects/:id/members` - List project members
- POST `/projects/:id/members` - Assign user to project
- DELETE `/projects/:id/members/:userId` - Remove member
- GET `/my/projects` - Projects current user can log time to

#### Phase 5: PTO Balances & Leave Requests ✅
- GET `/leave-requests/users/:userId/benefits` - User's benefit balances
- GET `/leave-requests?mine=true|team=true&status=pending` - List requests
- GET `/leave-requests/:id` - Get single request
- POST `/leave-requests` - Create leave request (validates balance)
- POST `/leave-requests/:id/approve` - Approve request (updates balance)
- POST `/leave-requests/:id/reject` - Reject request
- DELETE `/leave-requests/:id` - Cancel own pending request

#### Phase 6: Search & Helpers ✅
- GET `/search/projects?q=&limit=` - Search projects by name/code
- GET `/search/tasks?q=&project_id=&limit=` - Search tasks with optional project filter

#### Phase 7: Manager Team Views ✅
- GET `/timesheets?team=true&status=pending&from=&to=` - View team timesheets with pagination
- GET `/leave-requests?team=true&status=pending&from=&to=` - View team leave requests
- GET `/calendar?user_id=&from=&to=&include=` - Unified calendar feed (holidays, leave, timesheets)
- Team defined as direct reports via `profiles.manager_user_id`
- RBAC enforced at service level

#### Additional Features ✅
- GET `/users` - User management (admin/manager)
- POST `/users` - Create/invite user
- **POST `/users/import`** - Bulk import users from CSV/Excel with dry-run (admin-only)
- **GET `/users/import/template`** - Download CSV/Excel import template (admin-only)
- PATCH `/users/:id` - Update user
- DELETE `/users/:id` - Deactivate user
- GET `/organization` - Organization settings (admin)
- PATCH `/organization` - Update organization (admin)
- GET `/holidays` - Holiday calendar with filters
- GET `/benefit-types` - Benefit type management
- GET `/timesheet-policies/:tenantId` - Get/update tenant policy
- GET `/tasks` - Task management (hierarchical)

---

## Documentation

### User Stories
- **[docs/USER_STORIES_COMPLETE.md](docs/USER_STORIES_COMPLETE.md)** - Complete feature reference with 71 user stories
  - Maps all features to API endpoints
  - Includes acceptance criteria
  - Request/response examples
  - Implementation priorities

### API References
- **[docs/FRONTEND_API_REFERENCE.md](docs/FRONTEND_API_REFERENCE.md)** - Frontend integration guide
- **[docs/DASHBOARD_API_SPEC.md](docs/DASHBOARD_API_SPEC.md)** - Dashboard widget endpoints
- **[docs/MANAGER_TEAM_VIEWS.md](docs/MANAGER_TEAM_VIEWS.md)** - Manager-specific features
- **[docs/API_TIMESHEET_FRONTEND.md](docs/API_TIMESHEET_FRONTEND.md)** - Timesheet grid integration

### Testing
- **Postman collections** in `/postman` directory
- Seed scripts: `pnpm db:seed:manager` for demo data
- cURL examples in all documentation

---

## Testing & Verification

### Manual Testing
```bash
# Start development server
pnpm dev

# Health check
curl http://localhost:3000/api/v1/health

# Create demo data
pnpm db:seed:manager

# Login as manager
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@demo.com","password":"password123"}'
```

### Automated Testing
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov
```

---

## Common Operations

### Adding a New Endpoint
1. Create/update controller with new endpoint
2. Create/update service with business logic
3. Add DTOs with zod validation
4. Add authorization checks (guards/decorators)
5. Test with cURL or Postman
6. Update documentation
7. Run `pnpm build` to verify

### Database Changes
1. Update schema in `/src/db/schema/`
2. Generate migration: `pnpm db:generate`
3. Review migration in `/drizzle/migrations/`
4. Apply migration: `pnpm db:migrate`
5. Update `/referenceDBTABLES/` if needed

### Adding Validation
1. Create zod schema in DTO file
2. Use schema in controller with validation pipe
3. Test invalid inputs return 400 errors
4. Document validation rules

---

## Commit Checklist

Before committing code:

- [ ] Lint and build pass: `pnpm lint && pnpm build`
- [ ] DTOs validate inputs with zod
- [ ] Tests pass: `pnpm test`
- [ ] SQL queries are parameterized (no SQL injection)
- [ ] Correct HTTP status codes used (200, 201, 400, 401, 403, 404, 500)
- [ ] Error messages are clear and actionable
- [ ] Authorization checks in place
- [ ] Tenant isolation maintained (RLS)
- [ ] Documentation updated if API changed
- [ ] Example curl commands tested

---

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` in `.env`
- Check PostgreSQL is running: `docker ps`
- Test connection: `psql $DATABASE_URL`

### Authentication Errors
- Verify `SESSION_SECRET` is set in production
- Check session hasn't expired
- Verify user has membership in tenant

### Permission Errors (403)
- Check user role and permissions
- Verify manager-employee relationship
- Check project membership for time entries

### Build Errors
- Clear cache: `rm -rf dist node_modules && pnpm install`
- Verify Node version: `node --version` (should be 22+)
- Check TypeScript errors: `pnpm build`

---

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for signing tokens (production)

Optional with defaults:
- `NODE_ENV` - development | production (default: development)
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - debug | info | warn | error (default: info)
- `SESSION_TTL` - Session lifetime in seconds (default: 2592000 = 30 days)
- `REFRESH_TOKEN_TTL` - Refresh token lifetime (default: 7776000 = 90 days)

See `.env.example` for complete list.

---

## Performance Optimization

### Database
- Composite indexes on common query patterns
- Connection pooling (configured in db.service.ts)
- Pagination on large result sets
- Avoid N+1 queries (use joins)

### API
- Response compression (enabled in main.ts)
- Request validation with zod (fast schema validation)
- Structured logging (JSON format for easy parsing)

### Caching Opportunities
- Timesheet policies (rarely change)
- Benefit types (static configuration)
- Holidays (annual data)
- Project lists (moderate change frequency)

---

## Security Checklist

- [x] Session tokens are opaque UUIDs
- [x] Sessions stored in database (not client-side)
- [x] Password hashing with bcrypt
- [x] SQL injection prevention (parameterized queries)
- [x] Input validation on all endpoints (zod)
- [x] CORS configured (see main.ts)
- [x] RLS enforces tenant isolation
- [x] Authorization checks on protected routes
- [x] No sensitive data in error messages
- [x] Rate limiting (TODO: add in production)
- [x] HTTPS required in production

---

## Deployment Notes

### Production Checklist
1. Set `NODE_ENV=production`
2. Set strong `SESSION_SECRET` (use secrets manager)
3. Configure `DATABASE_URL` to production database
4. Enable HTTPS
5. Configure CORS for frontend domain
6. Set up database backups
7. Configure monitoring and alerting
8. Run migrations: `pnpm db:migrate`
9. Build: `pnpm build`
10. Start: `pnpm start:prod`

### Health Monitoring
- Health endpoint: `GET /api/v1/health`
- Returns database connection status
- Use for load balancer health checks

---

End of file
