# Manager Team Views API

This document describes the 3 new manager-focused endpoints added to the Kairos API.

## Overview

These endpoints enable managers to:
1. View pending timesheets for their direct reports
2. View pending leave requests for their direct reports
3. Access a unified calendar feed showing holidays, leave, and timesheet periods

## Authentication

All endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

## Team Scope

"Team" is defined as **direct reports** - users where `profiles.manager_user_id = current_user.id`.

RBAC is enforced at the service level:
- Users can only view their own data by default
- Managers can view data for their direct reports when using `team=true`
- Calendar access: users see their own; managers can specify team member `user_id`

---

## 1. GET /timesheets?team=true

### Description
Returns timesheets for the manager's direct reports with optional filtering and pagination.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `team` | boolean | Yes (for team view) | false | Set to `true` to filter by direct reports |
| `status` | string | No | - | Filter by status: `draft`, `submitted`, `approved`, `rejected` |
| `from` | date | No | - | Start date filter (YYYY-MM-DD) |
| `to` | date | No | - | End date filter (YYYY-MM-DD) |
| `page` | integer | No | 1 | Page number |
| `page_size` | integer | No | 20 | Items per page |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "name": "Bob Employee",
        "email": "bob@demo.com"
      },
      "weekStartDate": "2025-10-13",
      "status": "submitted",
      "totalHours": 38.5,
      "submittedAt": "2025-10-14T09:30:00Z",
      "reviewedAt": null,
      "reviewNote": null,
      "createdAt": "2025-10-10T08:00:00Z",
      "updatedAt": "2025-10-14T09:30:00Z"
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 3
}
```

### Example Requests

```bash
# Get all submitted timesheets from direct reports
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/timesheets?team=true&status=submitted"

# Get submitted timesheets for October 2025
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/timesheets?team=true&status=submitted&from=2025-10-01&to=2025-10-31"

# Paginated results
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/timesheets?team=true&status=submitted&page=1&page_size=10"
```

### Key Features
- **total_hours**: Calculated from sum of time_entries for that week
- **Pagination**: Supports page and page_size query parameters
- **Date filtering**: Filter by week_start_date range
- **Optimized**: Uses composite index on (tenant_id, status, week_start_date, user_id)

---

## 2. GET /leave-requests?team=true

### Description
Returns leave requests for the manager's direct reports with optional filtering and pagination.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `team` | boolean | Yes (for team view) | false | Set to `true` to filter by direct reports |
| `status` | string | No | - | Filter by status: `pending`, `approved`, `rejected`, `cancelled` |
| `from` | date | No | - | Start date for overlap filter (YYYY-MM-DD) |
| `to` | date | No | - | End date for overlap filter (YYYY-MM-DD) |
| `page` | integer | No | 1 | Page number |
| `page_size` | integer | No | 20 | Items per page |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "name": "Bob Employee",
        "email": "bob@demo.com"
      },
      "benefitType": {
        "id": "uuid",
        "key": "vacation",
        "name": "Vacation Days",
        "unit": "days"
      },
      "startDate": "2025-10-20",
      "endDate": "2025-10-22",
      "amount": "3",
      "status": "pending",
      "note": "Family vacation",
      "createdAt": "2025-10-10T10:00:00Z",
      "approverUserId": null,
      "approvedAt": null
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 2
}
```

### Example Requests

```bash
# Get all pending leave requests from direct reports
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/leave-requests?team=true&status=pending"

# Get leave requests overlapping with a date range
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/leave-requests?team=true&status=pending&from=2025-10-01&to=2025-12-31"
```

### Date Overlap Logic

When `from` and `to` are provided, the API returns requests where:
```
(start_date <= to) AND (end_date >= from)
```

This ensures all requests that overlap with the specified range are included.

### Key Features
- **Benefit type included**: Shows the type of leave (vacation, sick, etc.)
- **Date overlap filtering**: Finds all requests intersecting with date range
- **Pagination**: Full support for large result sets
- **Optimized**: Uses composite index on (tenant_id, status, start_date, end_date, user_id)

---

## 3. GET /calendar

### Description
Unified calendar feed combining holidays, approved leave requests, and optionally timesheet periods. Users can view their own calendar or managers can view team member calendars.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `user_id` | uuid | No | current user | User ID to fetch calendar for (manager can specify team members) |
| `from` | date | **Yes** | - | Start date (YYYY-MM-DD) |
| `to` | date | **Yes** | - | End date (YYYY-MM-DD) |
| `include` | string | No | all | Comma-separated: `holidays`, `leave`, `timesheets` |

### Response

```json
{
  "items": [
    {
      "type": "holiday",
      "title": "Thanksgiving",
      "date": "2025-11-28"
    },
    {
      "type": "leave",
      "title": "Vacation - Bob Employee",
      "start": "2025-10-20",
      "end": "2025-10-22",
      "userId": "uuid"
    },
    {
      "type": "timesheet_period",
      "title": "Timesheet (submitted)",
      "start": "2025-10-13",
      "end": "2025-10-19",
      "status": "submitted",
      "userId": "uuid"
    }
  ]
}
```

### Item Types

#### Holiday
```json
{
  "type": "holiday",
  "title": "Holiday Name",
  "date": "YYYY-MM-DD"
}
```

#### Leave
```json
{
  "type": "leave",
  "title": "Benefit Type - User Name",
  "start": "YYYY-MM-DD",
  "end": "YYYY-MM-DD",
  "userId": "uuid"
}
```

#### Timesheet Period
```json
{
  "type": "timesheet_period",
  "title": "Timesheet (status)",
  "start": "YYYY-MM-DD",
  "end": "YYYY-MM-DD",
  "status": "draft|submitted|approved|rejected",
  "userId": "uuid"
}
```

### Example Requests

```bash
# Get own calendar with all items
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/calendar?from=2025-10-01&to=2025-12-31"

# Get team member calendar (manager only)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/calendar?user_id=<employee_id>&from=2025-10-01&to=2025-12-31"

# Get only holidays
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/calendar?from=2025-10-01&to=2025-12-31&include=holidays"

# Get holidays and leave only (no timesheets)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/calendar?from=2025-10-01&to=2025-12-31&include=holidays,leave"
```

### RBAC for Calendar

- **Own calendar**: Any user can view their own calendar (default when `user_id` not specified)
- **Team member calendar**: Managers can view direct reports by providing `user_id`
- **Authorization check**: API verifies the current user is the manager of the specified `user_id`
- **Forbidden**: Returns 403 if trying to view calendar of non-direct-report

---

## Performance Optimizations

### Composite Indexes

Two new indexes were added for optimal query performance:

1. **timesheets**: `(tenant_id, status, week_start_date, user_id)`
2. **benefit_requests**: `(tenant_id, status, start_date, end_date, user_id)`

These indexes support the common filter patterns in manager team views.

---

## Demo Data

Run the seed script to create demo data:

```bash
pnpm db:seed:manager
```

This creates:
- 1 manager user: `manager@demo.com` / `password123`
- 2 employee users: `bob@demo.com`, `carol@demo.com` / `password123`
- Sample submitted timesheets
- Sample pending leave requests
- Sample holidays

### Testing Workflow

1. **Login as manager**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "manager@demo.com", "password": "password123"}'
   ```

2. **Get team timesheets**:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/v1/timesheets?team=true&status=submitted"
   ```

3. **Get team leave requests**:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/v1/leave-requests?team=true&status=pending"
   ```

4. **Get calendar for employee**:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/v1/calendar?user_id=<employee_id>&from=2025-10-01&to=2025-12-31"
   ```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Both \"from\" and \"to\" date parameters are required",
  "statusCode": 400
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired session",
  "statusCode": 401
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You can only view calendars for your direct reports",
  "statusCode": 403
}
```

---

## Postman Collection

Import the Postman collection from:
```
postman/Manager-Team-Views.postman_collection.json
```

The collection includes:
- Authentication requests
- All 3 endpoints with example requests
- Pre-configured variables for base URL and auth token
- Example responses

---

## Implementation Notes

### Manager Relationship

The manager-employee relationship is stored in the `profiles` table:
```sql
SELECT * FROM profiles WHERE manager_user_id = '<manager_id>';
```

This simple hierarchy supports direct reports only. For deeper hierarchies, consider:
- Recursive CTEs for org chart traversal
- Denormalized path fields (e.g., `/manager1/manager2/employee`)
- Separate `org_structure` table

### Future Enhancements

Potential extensions mentioned in the requirements:
- `department_id` filtering when `manager_id` is missing
- `project_id` filtering for project-based teams
- Benefit balance snapshots in leave requests
- Timesheet summary statistics (total hours, overtime, etc.)
- Export functionality (CSV, PDF)

---

## Database Schema

### Relevant Tables

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  manager_user_id UUID REFERENCES users(id),  -- Defines manager relationship
  job_title TEXT,
  start_date DATE,
  location TEXT,
  phone TEXT
);
```

#### timesheets
```sql
CREATE TABLE timesheets (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  status timesheet_status_enum NOT NULL,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  ...
);

CREATE INDEX idx_timesheets_team_view
  ON timesheets (tenant_id, status, week_start_date, user_id);
```

#### benefit_requests
```sql
CREATE TABLE benefit_requests (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  benefit_type_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  amount NUMERIC(6,2) NOT NULL,
  status request_status_enum NOT NULL,
  ...
);

CREATE INDEX idx_benefit_requests_team_view
  ON benefit_requests (tenant_id, status, start_date, end_date, user_id);
```

---

## Questions & Support

For issues or questions:
1. Check the Postman collection examples
2. Review the seed script for sample data structure
3. Examine the service layer implementation for business logic

---

**Last Updated**: 2025-10-16
**Version**: 1.0
**Status**: Production Ready
