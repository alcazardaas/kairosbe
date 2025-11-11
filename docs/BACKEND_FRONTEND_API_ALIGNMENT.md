# Backend-Frontend API Alignment Guide

**Date:** 2025-11-11
**Status:** ✅ Backend Already Uses camelCase
**Action Required:** Verification & Testing

---

## 🎯 Executive Summary

**Good News:** The Kairos Backend is **already architected and implemented** to return all API responses in **camelCase**. The database uses snake_case internally, but all API responses are transformed to camelCase at the service layer before being sent to clients.

### Key Points

✅ **All API responses use camelCase** (not snake_case)
✅ **Database uses snake_case** (internal only, never exposed to API)
✅ **Transformation layer is implemented** across all 71 endpoints
✅ **DTOs are defined with camelCase** properties
✅ **OpenAPI/Swagger docs reflect camelCase**

---

## 📋 How It Works

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (JavaScript/TypeScript)                    │
│  - Expects: camelCase                                │
│  - Gets: camelCase ✅                                │
└─────────────────────────────────────────────────────┘
                         ▲
                         │ JSON (camelCase)
                         │
┌─────────────────────────────────────────────────────┐
│  API Layer (Controllers + DTOs)                      │
│  - Request DTOs: camelCase                           │
│  - Response DTOs: camelCase                          │
│  - Transformation: transformKeysToCamel()            │
└─────────────────────────────────────────────────────┘
                         ▲
                         │ Transform at boundary
                         │
┌─────────────────────────────────────────────────────┐
│  Database Layer (PostgreSQL + Drizzle ORM)           │
│  - Tables: snake_case                                │
│  - Columns: snake_case                               │
│  - Queries: snake_case                               │
└─────────────────────────────────────────────────────┘
```

### Transformation Pattern

**Every service method transforms data before returning:**

```typescript
// Example from time-entries.service.ts
async findOne(id: string) {
  const db = this.dbService.getDb();

  // Query database (snake_case)
  const result = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, id))
    .limit(1);

  // Transform to camelCase for API response
  return transformKeysToCamel(result[0]);
}
```

**This pattern is used in:**
- ✅ All 71 endpoints
- ✅ All service methods
- ✅ All list/pagination responses
- ✅ All nested objects and arrays

---

## 📖 Complete Field Mapping Reference

### Time Entries

| Database (snake_case) | API Response (camelCase) |
|-----------------------|-------------------------|
| `id` | `id` |
| `tenant_id` | `tenantId` |
| `user_id` | `userId` |
| `project_id` | `projectId` |
| `task_id` | `taskId` |
| `week_start_date` | `weekStartDate` |
| `day_of_week` | `dayOfWeek` |
| `hours` | `hours` |
| `note` | `note` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

### Timesheets

| Database (snake_case) | API Response (camelCase) |
|-----------------------|-------------------------|
| `id` | `id` |
| `tenant_id` | `tenantId` |
| `user_id` | `userId` |
| `week_start_date` | `weekStartDate` |
| `status` | `status` |
| `submitted_at` | `submittedAt` |
| `submitted_by_user_id` | `submittedByUserId` |
| `reviewed_at` | `reviewedAt` |
| `reviewed_by_user_id` | `reviewedByUserId` |
| `review_note` | `reviewNote` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `time_entries` | `timeEntries` |

### Tasks

| Database (snake_case) | API Response (camelCase) |
|-----------------------|-------------------------|
| `id` | `id` |
| `tenant_id` | `tenantId` |
| `project_id` | `projectId` |
| `name` | `name` |
| `parent_task_id` | `parentTaskId` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

### Projects

| Database (snake_case) | API Response (camelCase) |
|-----------------------|-------------------------|
| `id` | `id` |
| `tenant_id` | `tenantId` |
| `name` | `name` |
| `code` | `code` |
| `description` | `description` |
| `status` | `status` |
| `start_date` | `startDate` |
| `end_date` | `endDate` |
| `client_name` | `clientName` |
| `budget_hours` | `budgetHours` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

### Leave Requests & Benefits

| Database (snake_case) | API Response (camelCase) |
|-----------------------|-------------------------|
| `id` | `id` |
| `tenant_id` | `tenantId` |
| `user_id` | `userId` |
| `benefit_type_id` | `benefitTypeId` |
| `start_date` | `startDate` |
| `end_date` | `endDate` |
| `status` | `status` |
| `total_days` | `totalDays` |
| `used_days` | `usedDays` |
| `available_days` | `availableDays` |
| `expires_at` | `expiresAt` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `approval_note` | `approvalNote` |

### Users & Profiles

| Database (snake_case) | API Response (camelCase) |
|-----------------------|-------------------------|
| `id` | `id` |
| `email` | `email` |
| `name` | `name` |
| `role` | `role` |
| `status` | `status` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `manager_user_id` | `managerUserId` |
| `department` | `department` |
| `job_title` | `jobTitle` |

### Holidays

| Database (snake_case) | API Response (camelCase) |
|-----------------------|-------------------------|
| `id` | `id` |
| `tenant_id` | `tenantId` |
| `name` | `name` |
| `date` | `date` |
| `country_code` | `countryCode` |
| `is_recurring` | `isRecurring` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

### Project Members

| Database (snake_case) | API Response (camelCase) |
|-----------------------|-------------------------|
| `id` | `id` |
| `tenant_id` | `tenantId` |
| `project_id` | `projectId` |
| `user_id` | `userId` |
| `role` | `role` |
| `created_at` | `createdAt` |

### Pagination & Meta

| Database (snake_case) | API Response (camelCase) |
|-----------------------|-------------------------|
| `page` | `page` |
| `limit` / `page_size` | `limit` / `pageSize` |
| `total` | `total` |

---

## 📝 Example API Responses

### ✅ Time Entry Response (Actual Format)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174010",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "123e4567-e89b-12d3-a456-426614174001",
  "projectId": "123e4567-e89b-12d3-a456-426614174002",
  "taskId": "123e4567-e89b-12d3-a456-426614174005",
  "weekStartDate": "2025-01-20T00:00:00.000Z",
  "dayOfWeek": 1,
  "hours": 8.5,
  "note": "Worked on feature implementation",
  "createdAt": "2025-01-20T09:00:00.000Z"
}
```

### ✅ Timesheet Response (Actual Format)

```json
{
  "data": {
    "id": "ts-123",
    "tenantId": "tenant-1",
    "userId": "user-456",
    "weekStartDate": "2025-01-13",
    "status": "pending",
    "submittedAt": "2025-01-20T15:00:00Z",
    "submittedByUserId": "user-456",
    "reviewedAt": null,
    "reviewedByUserId": null,
    "reviewNote": null,
    "createdAt": "2025-01-13T09:00:00Z",
    "updatedAt": "2025-01-20T15:00:00Z",
    "timeEntries": [
      {
        "id": "entry-1",
        "projectId": "proj-789",
        "taskId": "task-012",
        "dayOfWeek": 1,
        "hours": 8.0
      }
    ]
  }
}
```

### ✅ Paginated List Response (Actual Format)

```json
{
  "data": [
    {
      "id": "entry-1",
      "userId": "user-123",
      "projectId": "proj-456",
      "weekStartDate": "2025-01-13",
      "dayOfWeek": 1,
      "hours": 8.0,
      "createdAt": "2025-01-13T09:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

---

## 🔧 Query Parameters

### ✅ Backend Accepts Both Formats

For **query parameters**, the backend is flexible and accepts both formats:

```bash
# ✅ camelCase (Recommended for JavaScript/TypeScript)
GET /api/v1/time-entries?userId=123&weekStartDate=2025-01-13&dayOfWeek=1

# ✅ snake_case (Also supported for backward compatibility)
GET /api/v1/time-entries?user_id=123&week_start_date=2025-01-13&day_of_week=1
```

**Recommendation:** Use camelCase in query parameters to match JavaScript conventions.

---

## 🧪 Testing & Verification

### Test Endpoints

Run these tests to verify camelCase responses:

```bash
# 1. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@demo.com",
    "password": "password123"
  }'

# Response (camelCase):
# {
#   "data": {
#     "sessionToken": "...",
#     "tenantId": "...",
#     "userId": "...",
#     "expiresAt": "..."
#   }
# }

# 2. Get Time Entries
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/time-entries?page=1&limit=20"

# Response includes camelCase fields:
# {
#   "data": [
#     {
#       "userId": "...",
#       "projectId": "...",
#       "weekStartDate": "...",
#       "dayOfWeek": 1,
#       "createdAt": "..."
#     }
#   ],
#   "meta": { "page": 1, "limit": 20, "total": 50 }
# }

# 3. Get Timesheet
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/timesheets/my-current"

# Response includes camelCase fields:
# {
#   "data": {
#     "userId": "...",
#     "weekStartDate": "...",
#     "submittedAt": null,
#     "createdAt": "..."
#   }
# }
```

### OpenAPI/Swagger Documentation

Visit `http://localhost:3000/api` to see interactive API documentation with camelCase examples.

---

## 🔍 Troubleshooting

### If You're Seeing snake_case Responses

1. **Check the endpoint URL**
   - Ensure you're hitting `/api/v1/...` endpoints
   - Verify the server is running the latest code

2. **Check response headers**
   - Verify you're getting `Content-Type: application/json`
   - Check for any proxy/middleware that might be transforming responses

3. **Verify backend version**
   ```bash
   curl http://localhost:3000/api/v1/health
   # Should return: {"ok": true, "ts": "...", "database": "connected"}
   ```

4. **Check specific endpoint**
   - If a specific endpoint returns snake_case, report it as a bug
   - Provide the exact endpoint URL and request details

5. **Clear cache**
   - Clear browser cache
   - Clear any API response caches
   - Restart frontend dev server

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Getting `user_id` instead of `userId` | Old cached response | Clear cache, verify endpoint |
| TypeScript errors on response types | Type definitions don't match | Update types to use camelCase |
| Mix of camelCase and snake_case | Inconsistent types or transformations | Report specific endpoint |
| Query params not working | Using wrong format | Use camelCase or snake_case consistently |

---

## 📚 TypeScript Type Definitions

### Recommended Frontend Types

```typescript
// time-entry.types.ts
export interface TimeEntry {
  id: string;
  tenantId: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  weekStartDate: string;  // ISO 8601 date string
  dayOfWeek: number;      // 0-6 (0 = Sunday)
  hours: number;
  note: string | null;
  createdAt: string;      // ISO 8601 datetime string
}

// timesheet.types.ts
export interface Timesheet {
  id: string;
  tenantId: string;
  userId: string;
  weekStartDate: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submittedAt: string | null;
  submittedByUserId: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  timeEntries?: TimeEntry[];
}

// task.types.ts
export interface Task {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  parentTaskId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// project.types.ts
export interface Project {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived';
  startDate: string | null;
  endDate: string | null;
  clientName: string | null;
  budgetHours: number | null;
  createdAt: string;
  updatedAt: string;
}

// leave-request.types.ts
export interface LeaveRequest {
  id: string;
  tenantId: string;
  userId: string;
  benefitTypeId: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  totalDays: number;
  approvalNote: string | null;
  createdAt: string;
  updatedAt: string;
}

// benefit-balance.types.ts
export interface BenefitBalance {
  id: string;
  userId: string;
  benefitTypeId: string;
  totalDays: number;
  usedDays: number;
  availableDays: number;
  expiresAt: string | null;
  createdAt: string;
}

// pagination.types.ts
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface SingleResponse<T> {
  data: T;
}
```

---

## 🚀 Frontend Integration Best Practices

### 1. API Client Setup

```typescript
// api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const sessionToken = localStorage.getItem('sessionToken');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}
```

### 2. Type-Safe API Calls

```typescript
// api/time-entries.ts
import { apiFetch } from './client';
import { TimeEntry, PaginatedResponse } from '../types';

export const timeEntriesApi = {
  // List time entries
  list: async (params: {
    userId?: string;
    projectId?: string;
    weekStartDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TimeEntry>> => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    );

    return apiFetch(`/time-entries?${query}`);
  },

  // Get single time entry
  get: async (id: string): Promise<{ data: TimeEntry }> => {
    return apiFetch(`/time-entries/${id}`);
  },

  // Create time entry
  create: async (data: {
    userId: string;
    projectId: string;
    taskId?: string;
    weekStartDate: string;
    dayOfWeek: number;
    hours: number;
    note?: string;
  }): Promise<{ data: TimeEntry }> => {
    return apiFetch('/time-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update time entry
  update: async (id: string, data: {
    hours?: number;
    note?: string;
  }): Promise<{ data: TimeEntry }> => {
    return apiFetch(`/time-entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete time entry
  delete: async (id: string): Promise<void> => {
    return apiFetch(`/time-entries/${id}`, {
      method: 'DELETE',
    });
  },
};
```

### 3. React Query Integration

```typescript
// hooks/useTimeEntries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeEntriesApi } from '../api/time-entries';

export function useTimeEntries(params: {
  userId?: string;
  weekStartDate?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ['time-entries', params],
    queryFn: () => timeEntriesApi.list(params),
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: timeEntriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
}
```

---

## ✅ Checklist for Frontend Team

### Before Development

- [ ] Review this alignment document
- [ ] Update TypeScript types to use camelCase
- [ ] Test sample endpoints to verify camelCase responses
- [ ] Remove any manual transformation code (snake_case → camelCase)
- [ ] Configure API client with proper base URL and auth headers

### During Development

- [ ] Use camelCase in all TypeScript interfaces
- [ ] Use camelCase in query parameters (recommended)
- [ ] Handle dates as ISO 8601 strings
- [ ] Implement proper error handling for API responses
- [ ] Use TypeScript strict mode for type safety

### Testing

- [ ] Verify all API responses are camelCase
- [ ] Test pagination with meta object
- [ ] Test nested objects (e.g., timesheet with timeEntries)
- [ ] Test error responses
- [ ] Test authentication flow (login, session, logout)

---

## 📞 Support & Questions

### If You Encounter Issues

1. **Verify endpoint response format:**
   ```bash
   curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/<endpoint> | jq
   ```

2. **Check OpenAPI documentation:**
   - Visit: `http://localhost:3000/api`
   - Browse endpoint schemas
   - Verify response DTOs

3. **Report specific issues:**
   - Endpoint URL
   - Request method and body
   - Expected vs actual response
   - Backend version/commit

### Contact

- **Backend Team:** Report issues via GitHub/Slack
- **Documentation:** See `/docs` directory for complete API reference
- **API Testing:** Use Postman collections in `/postman` directory

---

## 📖 Related Documentation

- **[CLAUDE.md](../CLAUDE.md)** - Project conventions & naming standards
- **[README.md](../README.md)** - Project overview & setup
- **[FRONTEND_API_REFERENCE.md](./FRONTEND_API_REFERENCE.md)** - Complete API endpoint reference
- **[USER_STORIES_COMPLETE.md](./USER_STORIES_COMPLETE.md)** - Feature specifications

---

## 🎉 Summary

### What You Need to Know

1. ✅ **Backend uses camelCase for all API responses** (already implemented)
2. ✅ **No changes needed on backend** (transformation already in place)
3. ✅ **Frontend should use camelCase types** (matching API responses)
4. ✅ **All 71 endpoints return camelCase** (consistent across entire API)
5. ✅ **Query parameters support both formats** (camelCase recommended)

### What You Should Do

1. **Update your TypeScript types** to use camelCase (see examples above)
2. **Remove any transformation code** that converts snake_case to camelCase
3. **Test endpoints** to verify you're receiving camelCase responses
4. **Report any inconsistencies** if you find endpoints returning snake_case

### Expected Outcome

- **Zero TypeScript errors** related to naming conventions
- **Clean, idiomatic TypeScript/JavaScript** code
- **Direct mapping** between API responses and frontend types
- **No manual transformations** needed

---

**Last Updated:** 2025-11-11
**Backend Version:** 1.0.0
**API Version:** v1

---

**Questions?** Please reach out to the backend team with specific endpoint examples if you're still seeing snake_case responses. We're here to help ensure smooth integration! 🚀
