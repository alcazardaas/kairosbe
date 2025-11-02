# Tenant Handling in Kairos Backend

**🚨 CRITICAL: Frontend NEVER sends `tenant_id` in request parameters, URLs, or bodies**

---

## Overview

The Kairos backend uses **session-based tenant isolation**. Every session is bound to exactly one tenant, and the tenant context is automatically extracted from the session token on every request.

**This means:**
- ✅ Frontend only sends `Authorization: Bearer <sessionToken>` header
- ❌ Frontend NEVER sends `tenant_id` in URLs, query params, or request bodies
- ✅ Backend extracts `tenant_id` from the authenticated session automatically
- ✅ 100% consistency across all 71 API endpoints

---

## Architecture

### Session-Tenant Binding

```
User Login
    ↓
Backend creates session with tenant_id
    ↓
Session stored in database:
  - token (opaque UUID)
  - user_id
  - tenant_id  ← Bound at session creation
  - expires_at
    ↓
Frontend receives sessionToken
    ↓
Frontend stores sessionToken + tenantId (for display only)
```

### Request Flow

```
Frontend Request:
  GET /api/v1/timesheets
  Authorization: Bearer <sessionToken>

Backend (AuthGuard):
  1. Extract token from Authorization header
  2. Look up session in database
  3. Validate session not expired
  4. Extract tenant_id from session row
  5. Attach to request: request.tenantId = session.tenantId

Controller:
  @Get()
  async findAll(@CurrentTenantId() tenantId: string) {
    // tenantId automatically injected from request.tenantId
    return this.service.findAll(tenantId);
  }

Service:
  async findAll(tenantId: string) {
    // All queries filtered by tenantId
    return db.select()
      .from(timesheets)
      .where(eq(timesheets.tenantId, tenantId));
  }
```

---

## Frontend Implementation

### Login & Session Management

```typescript
// ✅ CORRECT: Login and store tenant info
const login = async (email: string, password: string) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  // Response structure:
  // {
  //   "data": {
  //     "sessionToken": "uuid-here",
  //     "refreshToken": "uuid-here",
  //     "tenantId": "tenant-uuid-here",
  //     "userId": "user-uuid-here",
  //     "expiresAt": "2025-12-01T..."
  //   }
  // }

  // Store both
  localStorage.setItem('sessionToken', data.data.sessionToken);
  localStorage.setItem('tenantId', data.data.tenantId);  // For display only!
  localStorage.setItem('userId', data.data.userId);

  return data.data;
};
```

### Making API Requests

```typescript
// ✅ CORRECT: Only send session token
const fetchTimesheets = async () => {
  const sessionToken = localStorage.getItem('sessionToken');

  const response = await fetch('/api/v1/timesheets', {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
      // NO tenant_id anywhere!
    }
  });

  return response.json();
};

// ✅ CORRECT: POST request - no tenant_id in body
const createTimesheet = async (weekStart: string) => {
  const sessionToken = localStorage.getItem('sessionToken');

  const response = await fetch('/api/v1/timesheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      week_start: weekStart,
      status: 'draft'
      // NO tenant_id in body!
    })
  });

  return response.json();
};

// ❌ WRONG: Don't do any of these
const wrongPatterns = async () => {
  const tenantId = localStorage.getItem('tenantId');

  // ❌ Don't put tenant_id in URL
  fetch(`/api/v1/timesheets?tenant_id=${tenantId}`);

  // ❌ Don't put tenant_id in path
  fetch(`/api/v1/${tenantId}/timesheets`);

  // ❌ Don't put tenant_id in request body
  fetch('/api/v1/timesheets', {
    body: JSON.stringify({ tenant_id: tenantId, ... })
  });
};
```

### When to Use Tenant ID on Frontend

**✅ Use tenant_id for:**

1. **Display purposes:**
```typescript
// Show which organization user is logged into
const DisplayOrgInfo = () => {
  const tenantId = localStorage.getItem('tenantId');
  return <div>Organization ID: {tenantId}</div>;
};
```

2. **Caching/State management:**
```typescript
// Use as cache key prefix
const cacheKey = `${tenantId}:timesheets:week:${weekStart}`;
localStorage.setItem(cacheKey, JSON.stringify(data));
```

3. **Multi-tenant switching UI:**
```typescript
// If user belongs to multiple tenants
const switchTenant = async (newTenantId: string) => {
  // Re-login with specific tenant
  await login(email, password, { tenantId: newTenantId });
  // New session created with new tenant context
};
```

**❌ DO NOT use tenant_id for:**
- API request URLs
- API request query parameters
- API request bodies
- API headers (other than Authorization with session token)

---

## Backend Implementation Pattern

### Controller Pattern (100% consistent across all modules)

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { CurrentTenantId } from '../auth/decorators/current-user.decorator';

@Controller('timesheets')
export class TimesheetsController {
  constructor(private readonly service: TimesheetsService) {}

  // ✅ GET endpoint
  @Get()
  async findAll(@CurrentTenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  // ✅ POST endpoint
  @Post()
  async create(
    @CurrentTenantId() tenantId: string,  // From session
    @Body() createDto: CreateDto           // From request body
  ) {
    return this.service.create(tenantId, createDto);
  }
}
```

### Service Pattern (tenant_id always first parameter)

```typescript
@Injectable()
export class TimesheetsService {
  async findAll(tenantId: string) {
    return this.db.select()
      .from(timesheets)
      .where(eq(timesheets.tenantId, tenantId));
  }

  async create(tenantId: string, createDto: CreateDto) {
    return this.db.insert(timesheets)
      .values({
        tenantId: tenantId,  // From session, not from DTO
        ...createDto
      });
  }
}
```

### DTO Pattern (NO tenant_id field in request DTOs)

```typescript
// ✅ CORRECT: No tenant_id in request DTO
export const createTimesheetSchema = z.object({
  week_start: z.string(),
  status: z.enum(['draft', 'submitted']),
  // NO tenant_id field
});

// ✅ Response DTOs can include tenant_id for reference
export class TimesheetResponseDto {
  id: string;
  tenantId: string;  // OK in responses
  weekStart: string;
  status: string;
}
```

---

## Multi-Tenant User Scenarios

### User Belongs to One Tenant

```typescript
// Login - backend selects user's only tenant automatically
const { sessionToken, tenantId } = await login(email, password);

// All requests scoped to that tenant via session
// No tenant_id needed in any request
```

### User Belongs to Multiple Tenants

```typescript
// Scenario 1: Login without specifying tenant
// Backend uses first active membership
const { sessionToken, tenantId } = await login(email, password);

// Scenario 2: Login with specific tenant
const { sessionToken, tenantId } = await login(email, password, {
  tenantId: 'specific-tenant-uuid'
});

// Switching tenants requires re-login
const switchToOtherTenant = async (newTenantId: string) => {
  // Logout current session
  await logout();

  // Login with new tenant
  await login(email, password, { tenantId: newTenantId });

  // New session created with new tenant context
};
```

---

## Security Implications

### Why This Pattern is Secure

1. **Tenant in session = tamper-proof**
   - Tenant ID stored server-side in database
   - Client cannot modify or forge tenant context
   - Even if client sends tenant_id in request, it's ignored

2. **Single source of truth**
   - Session is the only source of tenant context
   - No confusion about which tenant_id to trust
   - Eliminates entire class of tenant-hopping vulnerabilities

3. **Row Level Security (RLS) as backup**
   - PostgreSQL RLS policies enforce tenant isolation at DB level
   - Even if application code has a bug, RLS prevents cross-tenant access
   - Defense in depth approach

4. **Audit trail**
   - All actions tied to specific session
   - Session tied to specific tenant
   - Easy to track who did what in which tenant

### What This Prevents

❌ **Prevented attacks:**
- Client modifying tenant_id in request to access other tenant's data
- Accidental cross-tenant data leakage from client bugs
- Confused deputy attacks where client sends wrong tenant_id
- IDOR (Insecure Direct Object Reference) via tenant_id parameter

---

## Migration Notes

### Before (Inconsistent Pattern - timesheet-policies only)

```typescript
// ❌ Old pattern (was only in timesheet-policies)
GET    /api/v1/timesheet-policies/:tenantId
POST   /api/v1/timesheet-policies
  Body: { tenant_id: "uuid", week_start: 1, ... }
PATCH  /api/v1/timesheet-policies/:tenantId
DELETE /api/v1/timesheet-policies/:tenantId
```

### After (Consistent Pattern - ALL endpoints)

```typescript
// ✅ New pattern (now consistent everywhere)
GET    /api/v1/timesheet-policies
  Headers: { Authorization: Bearer <token> }
POST   /api/v1/timesheet-policies
  Headers: { Authorization: Bearer <token> }
  Body: { week_start: 1, ... }  // No tenant_id
PATCH  /api/v1/timesheet-policies
DELETE /api/v1/timesheet-policies
```

---

## Developer Checklist

### When Adding a New Endpoint

- [ ] Controller uses `@CurrentTenantId()` decorator to inject tenant
- [ ] Service receives `tenantId` as **first parameter**
- [ ] DTO **does NOT** include `tenant_id` field in request schema
- [ ] All database queries filtered by `tenantId`
- [ ] Response DTO **can** include `tenantId` for reference
- [ ] No `/:tenantId` in route paths
- [ ] No `tenant_id` in query parameters

### Code Review Checklist

- [ ] No `@Param('tenantId')` in controllers
- [ ] No `tenant_id` in request DTO schemas
- [ ] All service methods receive `tenantId` from decorator, not request body
- [ ] Database queries include `where(eq(table.tenantId, tenantId))`
- [ ] No hardcoded tenant_id values

---

## Examples from Production Code

### ✅ Correct Implementation: TimesheetsController

```typescript
// From: src/timesheets/timesheets.controller.ts
@Get()
async findAll(
  @CurrentTenantId() tenantId: string,
  @CurrentUserId() userId: string,
  @Query() filters: FilterDto
) {
  return this.service.findAll(tenantId, userId, filters);
}

@Post()
async create(
  @CurrentTenantId() tenantId: string,
  @CurrentUserId() userId: string,
  @Body(new ZodValidationPipe(createTimesheetSchema))
  createDto: CreateTimesheetDto
) {
  return this.service.create(tenantId, userId, createDto);
}
```

### ✅ Correct Implementation: LeaveRequestsController

```typescript
// From: src/leave-requests/leave-requests.controller.ts
@Get()
async findAll(
  @CurrentTenantId() tenantId: string,
  @CurrentUserId() userId: string,
  @Query() filters: FilterDto
) {
  return this.service.findAll(tenantId, userId, filters);
}

@Post()
async create(
  @CurrentTenantId() tenantId: string,
  @CurrentUserId() userId: string,
  @Body(new ZodValidationPipe(createLeaveRequestSchema))
  createDto: CreateLeaveRequestDto
) {
  return this.service.create(tenantId, userId, createDto);
}
```

### ✅ Correct Implementation: TimesheetPoliciesController (after refactor)

```typescript
// From: src/timesheet-policies/timesheet-policies.controller.ts
@Get()
async findOne(@CurrentTenantId() tenantId: string) {
  return this.service.findOne(tenantId);
}

@Post()
async create(
  @CurrentTenantId() tenantId: string,
  @Body(new ZodValidationPipe(createTimesheetPolicySchema))
  createDto: CreateTimesheetPolicyDto
) {
  return this.service.create(tenantId, createDto);
}

@Patch()
async update(
  @CurrentTenantId() tenantId: string,
  @Body(new ZodValidationPipe(updateTimesheetPolicySchema))
  updateDto: UpdateTimesheetPolicyDto
) {
  return this.service.update(tenantId, updateDto);
}

@Delete()
@HttpCode(HttpStatus.NO_CONTENT)
async remove(@CurrentTenantId() tenantId: string) {
  return this.service.remove(tenantId);
}
```

---

## FAQ

### Q: Why not use JWT with tenant_id in the payload?

**A:** Security and flexibility
- Opaque tokens can be invalidated immediately (logout works instantly)
- Tenant context stored server-side = tamper-proof
- Can track all active sessions per user/tenant in database
- Easier to implement session expiration and refresh
- No risk of JWT secret compromise exposing tenant structure

### Q: Can a user switch tenants without logging out?

**A:** No, by design
- Each session is bound to one tenant
- Switching tenants requires creating a new session (re-login)
- This ensures clean separation and audit trail
- Prevents accidental cross-tenant actions

### Q: What if I need to perform an admin operation across tenants?

**A:** Use appropriate admin endpoints
- Super-admin endpoints can accept tenant_id as parameter
- These should be separate endpoints with explicit admin authorization
- Example: `GET /admin/tenants/:tenantId/stats` (super admin only)
- Regular endpoints always use session tenant

### Q: How do I test endpoints locally?

**A:**
```bash
# 1. Login to get session token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@demo.com","password":"password123"}'

# Response includes sessionToken and tenantId
# Extract sessionToken

# 2. Use token in subsequent requests
TOKEN="uuid-from-login-response"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/timesheets

# 3. POST request - no tenant_id in body
curl -X POST http://localhost:3000/api/v1/timesheets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"week_start":"2025-01-06","status":"draft"}'
```

---

## Summary

**🎯 Key Takeaways:**

1. **Frontend NEVER sends tenant_id** in requests (URLs, params, or body)
2. **Frontend ONLY sends** `Authorization: Bearer <sessionToken>` header
3. **Backend extracts tenant_id** from session automatically via `@CurrentTenantId()`
4. **100% consistency** across all 71 endpoints
5. **Security by design** - tenant context cannot be forged by client
6. **Tenant_id available to frontend** for display and caching purposes only

**🚀 For Frontend Developers:**
- Store `tenantId` from login response for display
- Never include `tenant_id` in API requests
- Just send `Authorization` header with session token
- Backend handles all tenant scoping automatically

**🔧 For Backend Developers:**
- Always use `@CurrentTenantId()` decorator in controllers
- Service methods receive `tenantId` as first parameter
- Never expect `tenant_id` in DTOs or route parameters
- This pattern is enforced across 100% of endpoints

---

**Last Updated:** 2025-11-02
**Version:** 1.0 (After timesheet-policies refactor)
