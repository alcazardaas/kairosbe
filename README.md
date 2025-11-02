# Kairos Backend

A production-ready REST API for timesheet and PTO management built with NestJS, TypeScript, and PostgreSQL 16.

**🎯 Status:** All features implemented and ready for frontend integration

---

## 📚 Stack

- **Framework:** NestJS (REST API)
- **Language:** TypeScript
- **Database:** PostgreSQL 16
- **ORM:** Drizzle ORM (type-safe queries + migrations)
- **Validation:** Zod
- **Logging:** Pino (structured JSON)
- **Testing:** Vitest + Supertest
- **Runtime:** Node 22

---

## ⚡ Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16 database (see [Database Setup](#-database-setup))

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

# Lint code
pnpm lint

# Run tests
pnpm test
```

### Verify Installation

```bash
# Test health endpoint
curl http://localhost:3000/api/v1/health

# Expected response:
# {"ok":true,"ts":"2025-10-29T...", "database":"connected"}
```

---

## 🗄️ Database Setup

### External PostgreSQL Database Required

This project requires an external PostgreSQL 16 database (managed separately). The application only connects to the database; it does not start or manage it.

### Connection Configuration

Set `DATABASE_URL` in your `.env` file:

```bash
DATABASE_URL=postgresql://admin:admin@localhost:5432/kairos
```

Adjust credentials to match your database configuration.

### Schema Initialization

The database schema reference is in `/referenceDBTABLES/01_script_db_reference.sql`. This should already be applied to your database.

### Drizzle ORM Commands

```bash
# Generate a new migration (after schema changes)
pnpm db:generate

# Run migrations (applies changes to database)
pnpm db:migrate

# Open Drizzle Studio (GUI for browsing database)
pnpm db:studio
```

### Demo Data

```bash
# Seed database with demo users and data
pnpm db:seed:manager

# Creates:
# - Manager: manager@demo.com / password123
# - Employees: bob@demo.com, carol@demo.com / password123
# - Sample timesheets, leave requests, holidays
```

---

## 🎯 Features

### ✅ Complete Feature Set (71 Endpoints)

All 7 implementation phases are complete and production-ready:

#### 🔐 Authentication & Session Management
- Email/password authentication
- Session-based auth (opaque tokens, 30-day TTL)
- Refresh token rotation
- Multi-tenant support

#### ⏱️ Timesheet Management
- Weekly timesheet grid with daily/weekly totals
- Bulk operations (fill week, copy previous week)
- Submit/approve/reject workflow
- Validation against tenant policies
- Recall submitted timesheets

#### 📊 Time Entry Features
- Create, edit, delete time entries
- Week view with aggregations
- Project/task assignment validation
- Weekly statistics and project distribution
- Status-based locking (can't edit approved)

#### 🏢 Project & Task Management
- Project CRUD with membership tracking
- Hierarchical task management
- User project assignments
- Project member management

#### 🏖️ PTO & Leave Management
- Leave request workflow
- Benefit balance tracking
- Manager approval/rejection
- Multiple benefit types (PTO, sick leave, etc.)
- Balance validation on requests

#### 👔 Manager Team Views
- View team timesheets (direct reports)
- View team leave requests
- Unified calendar feed (holidays, leave, timesheets)
- Team member filtering

#### 📈 Dashboard & Analytics
- Weekly hours statistics with daily breakdown
- Project distribution and percentages
- User project statistics
- Holiday calendar with filters

#### ⚙️ Administration
- Organization settings management
- User management (create, edit, deactivate)
- Timesheet policy configuration
- Holiday management
- Benefit type configuration

#### 🔍 Search & Helpers
- Project search (name/code)
- Task search (filtered by project)
- Autocomplete support

### 🔒 Security Features

- ✅ Session-based authentication (database-backed)
- ✅ Multi-tenancy with Row Level Security (RLS)
- ✅ Role-based access control (admin, manager, employee)
- ✅ Password hashing (bcrypt)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Input validation (Zod schemas)
- ✅ CORS configuration
- ✅ Tenant isolation enforcement

---

## 📁 Project Structure

```
kairosbe/
├── src/
│   ├── main.ts                      # Application entry
│   ├── app.module.ts                # Root module
│   ├── db/
│   │   ├── schema/                  # Drizzle schema definitions
│   │   ├── db.service.ts            # Database connection
│   │   └── seed-*.ts                # Seed scripts
│   ├── auth/                        # Authentication & sessions
│   ├── timesheets/                  # Timesheet lifecycle
│   ├── time-entries/                # Time entry CRUD + stats
│   ├── projects/                    # Project management
│   ├── tasks/                       # Task management
│   ├── my-projects/                 # User project assignments
│   ├── leave-requests/              # PTO/leave management
│   ├── benefit-types/               # Benefit types config
│   ├── holidays/                    # Holiday calendar
│   ├── timesheet-policies/          # Policy configuration
│   ├── users/                       # User management
│   ├── organization/                # Organization settings
│   ├── calendar/                    # Unified calendar
│   ├── search/                      # Search helpers
│   ├── health/                      # Health check
│   └── common/                      # Shared utilities
├── docs/
│   ├── USER_STORIES_COMPLETE.md     # 71 user stories with API mapping
│   ├── FRONTEND_API_REFERENCE.md    # Frontend integration guide
│   ├── DASHBOARD_API_SPEC.md        # Dashboard endpoints
│   ├── MANAGER_TEAM_VIEWS.md        # Manager features
│   └── API_*.md                     # Feature-specific docs
├── postman/                         # Postman collections
├── referenceDBTABLES/               # Database schema reference
│   └── 01_script_db_reference.sql
├── drizzle/
│   └── migrations/                  # Database migrations
├── docker-compose.yml               # PostgreSQL 16 (dev)
├── .env.example                     # Environment template
├── CLAUDE.md                        # Project conventions
└── README.md                        # This file
```

---

## 🌐 API Overview

### Base URL
All endpoints are prefixed with `/api/v1`

### Standard Response Format

**Success:**
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

**Error:**
```json
{
  "error": "Bad Request",
  "message": "Validation failed: email is required",
  "statusCode": 400
}
```

### Pagination & Sorting

- Pagination: `?page=1&limit=20` (defaults: page=1, limit=20, max=100)
- Sorting: `?sort=created_at:desc`
- Filtering: Query parameters (e.g., `?status=pending&from=2025-01-01`)

### Authentication

All protected endpoints require a session token:

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Response includes sessionToken AND tenantId
# {
#   "data": {
#     "sessionToken": "uuid-token-here",
#     "tenantId": "tenant-uuid-here",  // Store for display, NOT for requests
#     "userId": "user-uuid-here",
#     "expiresAt": "2025-12-01T..."
#   }
# }

# Use returned sessionToken in subsequent requests
curl -H "Authorization: Bearer <sessionToken>" \
  http://localhost:3000/api/v1/auth/me
```

### Multi-Tenancy & Tenant Handling

**🚨 IMPORTANT: Frontend NEVER sends `tenant_id` in requests**

#### How It Works

1. **Session-Based Tenant Context:**
   - Each session is bound to exactly one tenant
   - Tenant ID is stored in the database with the session
   - Backend automatically extracts tenant ID from session token
   - Frontend only needs to send `Authorization: Bearer <token>` header

2. **Login Flow:**
   ```bash
   # Login response includes tenantId
   POST /api/v1/auth/login
   # Response: { sessionToken, tenantId, userId, ... }

   # Store sessionToken for API calls
   # Store tenantId for display purposes only (show which org user is in)
   ```

3. **All API Requests:**
   ```bash
   # ✅ CORRECT - Only send session token
   GET /api/v1/timesheets
   Authorization: Bearer <sessionToken>

   # ❌ WRONG - Don't send tenant_id
   GET /api/v1/timesheets?tenant_id=xxx  # ❌ Not needed
   GET /api/v1/timesheets/${tenantId}    # ❌ Not in URL
   POST /api/v1/timesheets
   Body: { tenant_id: xxx, ... }         # ❌ Not in body
   ```

4. **Backend Pattern (all controllers):**
   - Controllers use `@CurrentTenantId()` decorator
   - Tenant ID extracted from validated session automatically
   - No tenant_id in route parameters or request bodies
   - Services receive tenant_id as first parameter from decorator

5. **When You Need Tenant ID on Frontend:**
   - **Display**: Show organization name/ID in UI
   - **Multi-tenant switching**: User selects different tenant, re-login required
   - **Caching**: Use as cache key prefix
   - **DO NOT**: Send in API requests (backend handles it)

#### Example Frontend Code

```typescript
// ✅ Login - receive and store tenant_id
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { sessionToken, tenantId, userId } = await loginResponse.json();

// Store both
localStorage.setItem('sessionToken', sessionToken);
localStorage.setItem('tenantId', tenantId);  // For display only!

// ✅ All other requests - just send token
const timesheets = await fetch('/api/v1/timesheets', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`
    // NO tenant_id needed - backend gets it from session!
  }
});

// ✅ Use tenant_id for display
const displayOrgName = () => {
  const tenantId = localStorage.getItem('tenantId');
  return `Organization: ${tenantId}`;
};
```

#### Multi-Tenant User Switching

If a user belongs to multiple tenants:

```typescript
// User selects different tenant from dropdown
const newTenantId = selectedTenant.id;

// Re-login with specific tenant_id
await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email,
    password,
    tenantId: newTenantId  // Optional: specify which tenant to use
  })
});

// New session created with new tenant context
// Update stored sessionToken and tenantId
```

**Key Takeaway:** Tenant isolation is enforced at the session level. Frontend developers never need to worry about sending tenant_id in API requests - just include the session token and the backend handles the rest.

---

## 📖 Documentation

### Complete Documentation Suite

- **[docs/USER_STORIES_COMPLETE.md](docs/USER_STORIES_COMPLETE.md)** - 71 user stories with complete API mapping
  - Organized by 9 epics
  - Acceptance criteria for each story
  - Request/response examples
  - Implementation priorities (5-phase roadmap)

- **[docs/FRONTEND_API_REFERENCE.md](docs/FRONTEND_API_REFERENCE.md)** - Frontend integration guide
  - User story to API mapping
  - Complete endpoint specifications
  - React/TypeScript examples
  - Error handling patterns
  - Caching strategies

- **[docs/DASHBOARD_API_SPEC.md](docs/DASHBOARD_API_SPEC.md)** - Dashboard widget endpoints
  - Weekly statistics
  - Project distribution
  - Holiday calendar
  - TypeScript interfaces

- **[docs/MANAGER_TEAM_VIEWS.md](docs/MANAGER_TEAM_VIEWS.md)** - Manager-specific features
  - Team timesheet views
  - Team leave requests
  - Calendar feed
  - RBAC details

- **[CLAUDE.md](CLAUDE.md)** - Project conventions and development guide
  - Technical standards
  - API rules
  - Database rules
  - Security guidelines
  - Troubleshooting

### Testing Resources

- Postman collections in `/postman` directory
- Seed scripts for demo data
- cURL examples in all documentation

---

## 🚀 API Endpoint Summary

### 🔐 Authentication (4 endpoints)
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh session token
- `POST /auth/logout` - Logout (invalidate session)
- `GET /auth/me` - Get current user context

### ⏱️ Timesheets (10 endpoints)
- `GET /timesheets` - List timesheets (with team filtering)
- `GET /timesheets/:id` - Get single timesheet
- `GET /timesheets/my-current` - Get/create current week
- `POST /timesheets` - Create draft
- `POST /timesheets/:id/submit` - Submit for approval
- `POST /timesheets/:id/approve` - Approve (manager)
- `POST /timesheets/:id/reject` - Reject (manager)
- `POST /timesheets/:id/recall` - Recall submitted
- `POST /timesheets/:id/validate` - Validate against policy
- `DELETE /timesheets/:id` - Delete draft

### 📝 Time Entries (10 endpoints)
- `GET /time-entries/week/:userId/:weekStartDate` - Week view
- `POST /time-entries` - Create entry
- `POST /time-entries/bulk` - Bulk create/update
- `POST /time-entries/copy-week` - Copy previous week
- `PATCH /time-entries/:id` - Update entry
- `DELETE /time-entries/:id` - Delete entry
- `GET /time-entries/stats/weekly/:userId/:weekStartDate` - Weekly stats
- `GET /time-entries/stats/user-projects/:userId` - Project distribution
- Plus standard CRUD operations

### 🏢 Projects & Tasks (14 endpoints)
- Projects: GET, POST, PATCH, DELETE `/projects`
- Tasks: GET, POST, PATCH, DELETE `/tasks`
- `GET /my/projects` - User's assigned projects
- `GET /projects/:id/members` - Project members
- `POST /projects/:id/members` - Add member
- `DELETE /projects/:id/members/:userId` - Remove member

### 🏖️ Leave Requests (7 endpoints)
- `GET /leave-requests` - List requests (mine/team)
- `POST /leave-requests` - Create request
- `DELETE /leave-requests/:id` - Cancel request
- `POST /leave-requests/:id/approve` - Approve (manager)
- `POST /leave-requests/:id/reject` - Reject (manager)
- `GET /leave-requests/users/:userId/benefits` - Benefit balances

### 👔 Manager Features (1 endpoint)
- `GET /calendar` - Unified calendar feed

### 👥 User Management (4 endpoints)
- `GET /users` - List users (admin/manager)
- `POST /users` - Create/invite user
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Deactivate user

### ⚙️ Configuration (13 endpoints)
- Organization: GET, PATCH `/organization`
- Benefit Types: CRUD `/benefit-types`
- Holidays: CRUD `/holidays`
- Timesheet Policies: GET, POST, PATCH, DELETE `/timesheet-policies` (tenant from session)

### 🔍 Search & Helpers (3 endpoints)
- `GET /search/projects` - Search projects
- `GET /search/tasks` - Search tasks
- `GET /health` - Health check

**Total: 71 endpoints across 10 modules**

---

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Seed demo data
pnpm db:seed:manager

# Login as demo manager
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

### Postman Collections

Import collections from `/postman` directory for interactive testing.

---

## 📜 Scripts Reference

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
| `pnpm db:seed:manager` | Seed demo data (manager + employees) |

---

## 🔧 Environment Variables

### Required

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for signing tokens (production)

### Optional (with defaults)

- `NODE_ENV` - development | production (default: development)
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - debug | info | warn | error (default: info)
- `SESSION_TTL` - Session lifetime in seconds (default: 2592000 = 30 days)
- `REFRESH_TOKEN_TTL` - Refresh token lifetime (default: 7776000 = 90 days)

See [.env.example](.env.example) for complete list.

---

## 🎨 Frontend Integration

### Getting Started

1. **Review User Stories**: Start with [docs/USER_STORIES_COMPLETE.md](docs/USER_STORIES_COMPLETE.md)
2. **Read API Reference**: See [docs/FRONTEND_API_REFERENCE.md](docs/FRONTEND_API_REFERENCE.md)
3. **Authentication**: Implement login flow first (US-AUTH-001 to US-AUTH-004)
4. **Weekly Timesheet**: Core feature (US-TIME-001 to US-TIME-009)
5. **Dashboard**: Analytics widgets (US-DASH-001 to US-DASH-005)

### Key Integration Points

- All dates in ISO 8601 format (YYYY-MM-DD)
- Session tokens in Authorization header or httpOnly cookie
- Pagination on all list endpoints
- Week start day configurable per tenant (from GET /auth/me)
- Multi-tenancy handled automatically via session

### Example: Fetch Weekly Timesheet

```typescript
// TypeScript example
const getWeekView = async (userId: string, weekStart: string) => {
  const response = await fetch(
    `/api/v1/time-entries/week/${userId}/${weekStart}`,
    {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch week view');
  }

  return response.json();
};
```

---

## 🛡️ Security

### Authentication
- Session-based (opaque UUID tokens)
- Tokens stored in database
- 30-day session TTL (configurable)
- Refresh token rotation

### Authorization
- Role-based access control (RBAC)
- Three roles: admin, manager, employee
- Manager-employee hierarchy
- Permission checks on all protected routes

### Data Protection
- Password hashing (bcrypt)
- SQL injection prevention (parameterized queries)
- Input validation (Zod schemas)
- Row Level Security (RLS) for tenant isolation
- No sensitive data in error messages

### Multi-Tenancy
- Full tenant isolation via RLS
- Session scoped to one tenant
- All queries automatically filtered by tenant
- Cross-tenant data access prevented

---

## 🚀 Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Configure strong `SESSION_SECRET` (use secrets manager)
3. Set `DATABASE_URL` to production database
4. Enable HTTPS
5. Configure CORS for frontend domain
6. Set up database backups
7. Configure monitoring and alerting
8. Run migrations: `pnpm db:migrate`
9. Build: `pnpm build`
10. Start: `pnpm start:prod`

### Health Monitoring

```bash
# Health check endpoint
curl http://localhost:3000/api/v1/health

# Use for load balancer health checks
```

---

## 🤝 Contributing

### Development Guidelines

See [CLAUDE.md](CLAUDE.md) for complete project conventions.

**Key Principles:**
1. Keep modules small and explicit
2. Don't abstract prematurely
3. Database schema in `/referenceDBTABLES` is source of truth
4. Always explain what changed, why, and how to test
5. Consistency and clarity over brevity

**Before Committing:**
- [ ] `pnpm lint && pnpm build` passes
- [ ] Tests pass: `pnpm test`
- [ ] DTOs validate inputs with Zod
- [ ] SQL queries are parameterized
- [ ] Authorization checks in place
- [ ] Documentation updated

---

## 📊 Project Status

### Implementation: ✅ Complete (100%)

All 7 phases implemented:
- ✅ Auth & Session Management
- ✅ Timesheet Lifecycle
- ✅ Time Entry Management
- ✅ Project Access & Membership
- ✅ PTO Balances & Leave Requests
- ✅ Search & Helpers
- ✅ Manager Team Views

### Additional Features: ✅ Complete
- ✅ User Management
- ✅ Organization Settings
- ✅ Dashboard Analytics
- ✅ Calendar Integration
- ✅ Holiday Management
- ✅ Policy Configuration

**Ready for Production:** Yes

**Frontend Integration:** Ready to begin

---

## 📞 Support

### Documentation
- Complete user stories: [docs/USER_STORIES_COMPLETE.md](docs/USER_STORIES_COMPLETE.md)
- API reference: [docs/FRONTEND_API_REFERENCE.md](docs/FRONTEND_API_REFERENCE.md)
- Project conventions: [CLAUDE.md](CLAUDE.md)

### Testing
- Postman collections in `/postman`
- Demo data seed script: `pnpm db:seed:manager`
- Health check: `GET /api/v1/health`

---

## 📄 License

UNLICENSED - Private project

---

**Built with ❤️ using NestJS, TypeScript, and PostgreSQL**

**Version:** 1.0.0
**Last Updated:** 2025-10-29
