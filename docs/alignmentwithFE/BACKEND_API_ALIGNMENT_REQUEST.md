# Backend API Alignment Request

**Date:** 2025-01-11
**From:** Frontend Team
**To:** Backend Team
**Priority:** High
**Impact:** TypeScript type safety, Developer experience, Maintainability

---

## Executive Summary

We request that all API endpoints return responses in **camelCase** naming convention to align with:
- JavaScript/TypeScript best practices
- Frontend type definitions
- Industry standards for REST APIs consumed by JavaScript clients

This change will eliminate **29 remaining TypeScript errors** and prevent ongoing type mismatches between API DTOs and frontend models.

---

## Current Problem

### 1. **Inconsistent Naming Conventions**

The API currently uses **snake_case** for some properties, causing type mismatches:

```typescript
// ❌ Current API Response (snake_case)
{
  "user_id": "123",
  "week_start_date": "2025-01-13",
  "day_of_week": 1,
  "created_at": "2025-01-11T10:00:00Z",
  "project_id": "456",
  "task_id": "789"
}

// ✅ Expected Frontend Format (camelCase)
{
  "userId": "123",
  "weekStartDate": "2025-01-13",
  "dayOfWeek": 1,
  "createdAt": "2025-01-11T10:00:00Z",
  "projectId": "456",
  "taskId": "789"
}
```

### 2. **Impact on Type Safety**

This mismatch causes:
- **29 TypeScript errors** that cannot be easily resolved
- Manual type transformations in every component
- Increased risk of runtime errors
- Poor developer experience with constant type casting

### 3. **Affected Areas**

The following entities have inconsistent naming:
- ✅ **Users** - Already uses camelCase (no changes needed)
- ❌ **Time Entries** - Uses snake_case
- ❌ **Timesheets** - Mixed naming
- ❌ **Projects** - Some snake_case properties
- ❌ **Tasks** - Uses snake_case
- ❌ **Leave Requests** - Some snake_case properties

---

## Proposed Solution

### **Option 1: Full camelCase Migration (Recommended)**

Convert all API responses to camelCase. This is the **industry standard** for REST APIs consumed by JavaScript/TypeScript clients.

**Benefits:**
- ✅ Aligns with JavaScript conventions
- ✅ No transformation needed in frontend
- ✅ Better TypeScript type inference
- ✅ Matches popular APIs (Stripe, GitHub, etc.)

**Examples of major APIs using camelCase:**
- GitHub API
- Stripe API
- Twitter API
- Google Cloud APIs

### **Option 2: Add API Versioning**

If Option 1 has breaking change concerns:
- Keep `/api/v1` with current snake_case
- Create `/api/v2` with camelCase
- Frontend migrates endpoints gradually

---

## Detailed Endpoint Changes Required

### **1. Time Entries Endpoints**

#### **GET /time-entries**

```diff
Response:
{
  "data": [
    {
      "id": "entry-123",
-     "tenant_id": "tenant-1",
+     "tenantId": "tenant-1",
-     "user_id": "user-456",
+     "userId": "user-456",
-     "project_id": "proj-789",
+     "projectId": "proj-789",
-     "task_id": "task-012",
+     "taskId": "task-012",
-     "week_start_date": "2025-01-13",
+     "weekStartDate": "2025-01-13",
-     "day_of_week": 1,
+     "dayOfWeek": 1,
      "hours": 8,
      "note": "Development work",
-     "created_at": "2025-01-11T10:00:00Z",
+     "createdAt": "2025-01-11T10:00:00Z",
-     "updated_at": "2025-01-11T10:00:00Z"
+     "updatedAt": "2025-01-11T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

#### **POST /time-entries**

```diff
Request Body:
{
- "user_id": "user-456",
+ "userId": "user-456",
- "project_id": "proj-789",
+ "projectId": "proj-789",
- "task_id": "task-012",
+ "taskId": "task-012",
- "week_start_date": "2025-01-13",
+ "weekStartDate": "2025-01-13",
- "day_of_week": 1,
+ "dayOfWeek": 1,
  "hours": 8,
  "note": "Development work"
}
```

#### **PATCH /time-entries/:id**

```diff
Request Body:
{
  "hours": 7.5,
  "note": "Updated hours"
}
```
*(No changes needed - already correct)*

---

### **2. Timesheets Endpoints**

#### **GET /timesheets**

```diff
Response:
{
  "data": [
    {
      "id": "ts-123",
-     "user_id": "user-456",
+     "userId": "user-456",
-     "week_start_date": "2025-01-13",
+     "weekStartDate": "2025-01-13",
      "status": "draft",
-     "submitted_at": null,
+     "submittedAt": null,
-     "submitted_by_user_id": null,
+     "submittedByUserId": null,
-     "approved_at": null,
+     "approvedAt": null,
-     "approved_by_user_id": null,
+     "approvedByUserId": null,
-     "rejected_at": null,
+     "rejectedAt": null,
-     "review_note": null,
+     "reviewNote": null,
-     "total_hours": 0,
+     "totalHours": 0,
-     "created_at": "2025-01-11T10:00:00Z",
+     "createdAt": "2025-01-11T10:00:00Z",
-     "updated_at": "2025-01-11T10:00:00Z",
+     "updatedAt": "2025-01-11T10:00:00Z",
-     "time_entries": ["entry-1", "entry-2"]
+     "timeEntries": ["entry-1", "entry-2"]
    }
  ]
}
```

#### **POST /timesheets**

```diff
Request Body:
{
- "week_start_date": "2025-01-13",
+ "weekStartDate": "2025-01-13",
- "user_id": "user-456"
+ "userId": "user-456"
}
```

#### **POST /timesheets/:id/submit**

*(No request body changes needed)*

```diff
Response:
{
  "data": {
    "id": "ts-123",
    "status": "pending",
-   "submitted_at": "2025-01-11T15:00:00Z",
+   "submittedAt": "2025-01-11T15:00:00Z",
    ...
  }
}
```

---

### **3. Tasks Endpoints**

#### **GET /tasks**

```diff
Response:
{
  "data": [
    {
      "id": "task-123",
      "name": "Feature Development",
      "description": "Build new feature",
-     "project_id": "proj-789",
+     "projectId": "proj-789",
-     "parent_task_id": null,
+     "parentTaskId": null,
      "status": "in_progress",
-     "estimated_hours": 40,
+     "estimatedHours": 40,
-     "created_at": "2025-01-01T00:00:00Z",
+     "createdAt": "2025-01-01T00:00:00Z",
-     "updated_at": "2025-01-11T10:00:00Z"
+     "updatedAt": "2025-01-11T10:00:00Z"
    }
  ]
}
```

#### **POST /tasks** and **PUT /tasks/:id**

```diff
Request Body:
{
  "name": "Task Name",
  "description": "Task description",
- "project_id": "proj-789",
+ "projectId": "proj-789",
- "parent_task_id": null,
+ "parentTaskId": null,
  "status": "todo",
- "estimated_hours": 40
+ "estimatedHours": 40
}
```

---

### **4. Projects Endpoints**

#### **GET /projects/:id/members**

```diff
Response:
{
  "data": [
    {
      "id": "member-123",
-     "project_id": "proj-789",
+     "projectId": "proj-789",
-     "user_id": "user-456",
+     "userId": "user-456",
      "role": "member",
-     "created_at": "2025-01-01T00:00:00Z"
+     "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### **5. Leave Requests Endpoints**

#### **GET /leave-requests/users/:userId/benefits**

```diff
Response:
{
  "data": [
    {
      "id": "benefit-123",
      "name": "Annual Leave",
-     "benefit_type_id": "type-456",
+     "benefitTypeId": "type-456",
-     "user_id": "user-789",
+     "userId": "user-789",
-     "total_days": 20,
+     "totalDays": 20,
-     "used_days": 5,
+     "usedDays": 5,
-     "available_days": 15,
+     "availableDays": 15,
-     "expires_at": "2025-12-31",
+     "expiresAt": "2025-12-31",
-     "created_at": "2025-01-01T00:00:00Z"
+     "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### **6. Calendar Endpoints**

#### **GET /calendar**

Ensure all returned items use camelCase:

```diff
Response:
{
  "data": [
    {
      "id": "cal-123",
      "type": "holiday",
      "title": "New Year's Day",
      "date": "2025-01-01",
-     "start_date": "2025-01-01",
+     "startDate": "2025-01-01",
-     "end_date": "2025-01-01",
+     "endDate": "2025-01-01",
-     "user_id": null,
+     "userId": null,
-     "created_at": "2024-12-01T00:00:00Z"
+     "createdAt": "2024-12-01T00:00:00Z"
    }
  ]
}
```

---

## Query Parameters

### Current State
Some endpoints accept snake_case query parameters:
```
GET /time-entries?user_id=123&week_start_date=2025-01-13&day_of_week=1
```

### Recommended
Support **both** camelCase and snake_case for query parameters during transition:
```
GET /time-entries?userId=123&weekStartDate=2025-01-13&dayOfWeek=1
```

This provides **backward compatibility** while frontend migrates.

---

## Implementation Recommendations

### 1. **Serialization Layer**
Update your serialization/JSON encoding to automatically transform:
- **Python:** Use `CamelModel` or custom serializer
- **Node.js:** Use `camelcase-keys` middleware
- **Java:** Configure Jackson `@JsonProperty` or `PropertyNamingStrategy`
- **.NET:** Configure `JsonSerializerOptions` with `JsonNamingPolicy.CamelCase`

### 2. **Validation**
- Keep internal database/ORM using snake_case
- Transform only at API boundary (serialization layer)
- Add API tests to verify camelCase output

### 3. **Documentation**
Update API documentation (Swagger/OpenAPI) to reflect camelCase.

---

## Migration Strategy

### **Phase 1: Add camelCase Support (Week 1)**
- Add serialization layer that outputs camelCase
- Accept BOTH snake_case and camelCase in request bodies (for backward compatibility)
- Deploy to staging for frontend testing

### **Phase 2: Frontend Migration (Week 2)**
- Frontend updates to use new camelCase responses
- Remove transformation layer in frontend
- Verify all TypeScript errors resolved

### **Phase 3: Deprecate snake_case (Week 3-4)**
- Add deprecation warnings for snake_case in request bodies
- Update all internal services/scripts

### **Phase 4: Remove snake_case Support (Week 5+)**
- Remove snake_case deserialization
- Fully enforce camelCase

---

## Benefits Summary

| Benefit | Impact |
|---------|--------|
| **Type Safety** | Eliminates 29 TypeScript errors |
| **Developer Experience** | No manual transformations needed |
| **Maintainability** | Single source of truth for types |
| **Industry Standard** | Aligns with JavaScript best practices |
| **Performance** | Removes transformation overhead in frontend |
| **Consistency** | One naming convention across full stack |

---

## Frontend Team Commitments

Once backend implements camelCase:
- ✅ We will update all type definitions within 1 week
- ✅ We will remove all transformation/mapping code
- ✅ We will achieve 0 TypeScript errors
- ✅ We will update integration tests

---

## Examples from Industry

### **Stripe API (camelCase)**
```json
{
  "customerId": "cus_123",
  "createdAt": 1641024000,
  "subscriptionId": "sub_456"
}
```

### **GitHub API (camelCase)**
```json
{
  "userId": 123,
  "createdAt": "2025-01-01T00:00:00Z",
  "repoId": 456
}
```

### **Twilio API (camelCase)**
```json
{
  "accountSid": "AC123",
  "dateCreated": "2025-01-01",
  "messageSid": "SM456"
}
```

---

## Questions & Contact

For questions or clarifications, please contact:
- **Frontend Lead:** [Your Name]
- **TypeScript/Type Safety:** [Team Contact]
- **Slack Channel:** `#api-alignment`

---

## Appendix: Complete Property Mapping

### Time Entries
| Current (snake_case) | Proposed (camelCase) |
|---------------------|---------------------|
| `user_id` | `userId` |
| `project_id` | `projectId` |
| `task_id` | `taskId` |
| `week_start_date` | `weekStartDate` |
| `day_of_week` | `dayOfWeek` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `tenant_id` | `tenantId` |

### Timesheets
| Current (snake_case) | Proposed (camelCase) |
|---------------------|---------------------|
| `user_id` | `userId` |
| `week_start_date` | `weekStartDate` |
| `submitted_at` | `submittedAt` |
| `submitted_by_user_id` | `submittedByUserId` |
| `approved_at` | `approvedAt` |
| `approved_by_user_id` | `approvedByUserId` |
| `rejected_at` | `rejectedAt` |
| `review_note` | `reviewNote` |
| `total_hours` | `totalHours` |
| `time_entries` | `timeEntries` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

### Tasks
| Current (snake_case) | Proposed (camelCase) |
|---------------------|---------------------|
| `project_id` | `projectId` |
| `parent_task_id` | `parentTaskId` |
| `estimated_hours` | `estimatedHours` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

### Projects
| Current (snake_case) | Proposed (camelCase) |
|---------------------|---------------------|
| `start_date` | `startDate` |
| `end_date` | `endDate` |
| `client_name` | `clientName` |
| `budget_hours` | `budgetHours` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

### Leave Requests & Benefits
| Current (snake_case) | Proposed (camelCase) |
|---------------------|---------------------|
| `benefit_type_id` | `benefitTypeId` |
| `user_id` | `userId` |
| `start_date` | `startDate` |
| `end_date` | `endDate` |
| `total_days` | `totalDays` |
| `used_days` | `usedDays` |
| `available_days` | `availableDays` |
| `expires_at` | `expiresAt` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

---

**Thank you for considering this request!**

This alignment will significantly improve our codebase quality and developer experience. We're happy to collaborate on the implementation and provide any additional information needed.
