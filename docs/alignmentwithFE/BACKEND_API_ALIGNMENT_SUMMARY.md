# Backend API Alignment - Executive Summary

## TL;DR

**Request:** Convert all API responses from `snake_case` to `camelCase`

**Why:**
- Aligns with JavaScript/TypeScript best practices
- Eliminates 29 TypeScript errors in frontend
- Matches industry standards (Stripe, GitHub, Twilio all use camelCase)

**Impact:** High improvement in type safety and developer experience

---

## The Problem in 30 Seconds

```typescript
// ❌ Current API (snake_case - causes 29 TS errors)
{
  "user_id": "123",
  "week_start_date": "2025-01-13",
  "day_of_week": 1
}

// ✅ JavaScript Standard (camelCase - 0 errors)
{
  "userId": "123",
  "weekStartDate": "2025-01-13",
  "dayOfWeek": 1
}
```

---

## What Needs to Change

### Affected Endpoints (High Priority)

1. **Time Entries** - `/time-entries`
   - `user_id` → `userId`
   - `project_id` → `projectId`
   - `week_start_date` → `weekStartDate`
   - `day_of_week` → `dayOfWeek`

2. **Timesheets** - `/timesheets`
   - `week_start_date` → `weekStartDate`
   - `submitted_at` → `submittedAt`
   - `time_entries` → `timeEntries`

3. **Tasks** - `/tasks`
   - `project_id` → `projectId`
   - `parent_task_id` → `parentTaskId`

4. **Projects** - `/projects`
   - `start_date` → `startDate`
   - `client_name` → `clientName`

5. **Leave Requests** - `/leave-requests`
   - `benefit_type_id` → `benefitTypeId`
   - `total_days` → `totalDays`

---

## Implementation (Simple!)

Most modern frameworks have built-in camelCase serialization:

```python
# Python (FastAPI/Pydantic)
class User(BaseModel):
    class Config:
        alias_generator = to_camel

# Node.js (Express)
app.use(camelcaseKeys)

# .NET
JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase

# Java (Spring Boot)
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
```

---

## Migration Plan

| Phase | Timeline | Action |
|-------|----------|--------|
| **1** | Week 1 | Backend adds camelCase output |
| **2** | Week 2 | Frontend updates & tests |
| **3** | Week 3 | Deprecate snake_case warnings |
| **4** | Week 4+ | Full migration complete |

**Backward Compatibility:** Support both formats in request bodies during transition.

---

## Benefits

✅ **Eliminates 29 TypeScript errors**
✅ **No manual transformations in frontend**
✅ **Follows JavaScript industry standards**
✅ **Better developer experience**
✅ **Single source of truth for types**

---

## Frontend Commitment

Once implemented, we will:
- Update all types within 1 week
- Remove transformation code
- Achieve 0 TypeScript errors
- Provide full testing support

---

**Full Details:** See `BACKEND_API_ALIGNMENT_REQUEST.md`

**Questions?** Contact Frontend Team or post in `#api-alignment`
