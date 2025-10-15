# Phase 7: Manager Team Views

**Status**: ✅ Complete
**Date**: 2025-10-16

## Summary

Implemented 3 new manager-focused endpoints enabling managers to view and manage their direct reports' timesheets, leave requests, and calendars.

## Endpoints Implemented

### 1. GET /timesheets?team=true&status=pending

View team members' timesheets with filtering and pagination.

**Key Features**:
- Filter by direct reports only
- Status filtering (draft, submitted, approved, rejected)
- Date range filtering
- Pagination support
- Total hours calculation per timesheet
- User information included

**Example**:
```bash
GET /api/v1/timesheets?team=true&status=submitted&from=2025-10-01&to=2025-10-31&page=1&page_size=20
```

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "user": {"id": "uuid", "name": "Bob Employee"},
      "weekStartDate": "2025-10-13",
      "status": "submitted",
      "totalHours": 38.5,
      "submittedAt": "2025-10-14T09:30:00Z"
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 3
}
```

---

### 2. GET /leave-requests?team=true&status=pending

View team members' leave requests with filtering and pagination.

**Key Features**:
- Filter by direct reports only
- Status filtering (pending, approved, rejected, cancelled)
- Date overlap filtering
- Pagination support
- Benefit type information included

**Example**:
```bash
GET /api/v1/leave-requests?team=true&status=pending&from=2025-10-01&to=2025-12-31&page=1&page_size=20
```

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "user": {"id": "uuid", "name": "Bob Employee"},
      "benefitType": {"key": "vacation", "name": "Vacation Days"},
      "startDate": "2025-10-20",
      "endDate": "2025-10-22",
      "amount": "3",
      "status": "pending"
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 2
}
```

---

### 3. GET /calendar

Unified calendar feed showing holidays, approved leave, and timesheet periods.

**Key Features**:
- View own calendar or team member calendar (managers only)
- Selectable item types (holidays, leave, timesheets)
- Date range filtering
- RBAC enforcement

**Example**:
```bash
GET /api/v1/calendar?user_id=<employee_id>&from=2025-10-01&to=2025-12-31&include=holidays,leave,timesheets
```

**Response**:
```json
{
  "items": [
    {"type": "holiday", "title": "Thanksgiving", "date": "2025-11-28"},
    {"type": "leave", "title": "Vacation - Bob", "start": "2025-10-20", "end": "2025-10-22"},
    {"type": "timesheet_period", "title": "Timesheet (submitted)", "start": "2025-10-13", "end": "2025-10-19"}
  ]
}
```

---

## Team Definition

**Direct Reports**: Users where `profiles.manager_user_id = current_user.id`

---

## Database Changes

### Composite Indexes

Two new indexes for optimal query performance:

1. **timesheets**: `(tenant_id, status, week_start_date, user_id)`
2. **benefit_requests**: `(tenant_id, status, start_date, end_date, user_id)`

---

## RBAC & Authorization

- **Service-level checks**: Manager relationship verified via `profiles` table
- **Team scope**: Only direct reports visible with `team=true`
- **Calendar access**: Users see own calendar; managers can view team members'
- **Error handling**: 403 Forbidden if attempting to view non-direct-report data

---

## Demo Data

### Seed Command
```bash
pnpm db:seed:manager
```

### What It Creates
- 1 Manager: `manager@demo.com` / `password123`
- 2 Employees: `bob@demo.com`, `carol@demo.com` / `password123`
- Submitted timesheets
- Pending leave requests
- Sample holidays

---

## Testing

### Quick Start

1. **Run seed**:
   ```bash
   pnpm db:seed:manager
   ```

2. **Login as manager**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "manager@demo.com", "password": "password123"}'
   ```

3. **Test endpoints**:
   ```bash
   export TOKEN="<your_token>"

   # Team timesheets
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/v1/timesheets?team=true&status=submitted"

   # Team leave requests
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/v1/leave-requests?team=true&status=pending"

   # Calendar
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/v1/calendar?from=2025-10-01&to=2025-12-31"
   ```

### Postman Collection

Import: `postman/Manager-Team-Views.postman_collection.json`

---

## Documentation

- **API Reference**: [MANAGER_TEAM_VIEWS.md](./MANAGER_TEAM_VIEWS.md)
- **Implementation Details**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Postman Collection**: `postman/Manager-Team-Views.postman_collection.json`

---

## Files Modified

### Created (7 files)
1. `src/calendar/calendar.service.ts`
2. `src/calendar/calendar.controller.ts`
3. `src/calendar/calendar.module.ts`
4. `src/db/seed-manager-team.ts`
5. `docs/MANAGER_TEAM_VIEWS.md`
6. `docs/IMPLEMENTATION_SUMMARY.md`
7. `postman/Manager-Team-Views.postman_collection.json`

### Modified (8 files)
1. `src/timesheets/timesheets.service.ts`
2. `src/timesheets/timesheets.controller.ts`
3. `src/leave-requests/leave-requests.service.ts`
4. `src/leave-requests/leave-requests.controller.ts`
5. `src/db/schema/timesheets.ts`
6. `src/db/schema/benefits.ts`
7. `src/app.module.ts`
8. `package.json`

---

## Next Steps

This completes Phase 7. Roadmap status:

- ✅ Phase 1: Auth & Session
- ✅ Phase 2: Timesheet Lifecycle
- ✅ Phase 3: Project Access & Membership
- ✅ Phase 4: PTO Balances & Leave Requests
- ✅ Phase 5: Policy Surface for Frontend Boot
- ✅ Phase 6: Search Helpers
- ✅ **Phase 7: Manager Team Views**

**System is now feature-complete** for the MVP scope.

---

## Future Enhancements

- Department-based teams (when `manager_id` missing)
- Project-based teams (cross-functional)
- Bulk approval actions
- Export functionality (CSV, PDF)
- Dashboard metrics
- Notifications for pending approvals
