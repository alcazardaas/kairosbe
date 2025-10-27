# Timesheet API - Frontend Integration Guide

This document provides comprehensive guidance for frontend developers integrating with the Kairos timesheet API endpoints.

## Table of Contents
- [Authentication](#authentication)
- [Time Entries API](#time-entries-api)
- [Tasks API](#tasks-api)
- [Common Patterns](#common-patterns)
- [Error Handling](#error-handling)

---

## Authentication

All endpoints require a valid session token obtained from the login endpoint.

### Login

```bash
POST /api/v1/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "data": {
    "token": "2a09d5a0-37d9-46a9-a909-de4164dc886d",
    "refreshToken": "583129d6-f32d-4794-b06a-5ec761976981",
    "expiresAt": "2025-11-26T22:12:04.026Z",
    "user": {
      "id": "00000000-0000-0000-0000-000000000002",
      "email": "user@example.com",
      "name": "User Name"
    },
    "tenant": {
      "id": "5541fadb-ac76-4ade-b777-ee496f5c20fa"
    }
  }
}
```

**Headers for authenticated requests:**
```
Authorization: Bearer <token>
```

---

## Time Entries API

### GET /api/v1/time-entries

Retrieve time entries with flexible filtering and pagination.

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `user_id` | UUID | No | Filter by user ID | `00000000-0000-0000-0000-000000000002` |
| `week_start_date` | YYYY-MM-DD | No | Filter by week start date (exact match or range start) | `2025-01-06` |
| `week_end_date` | YYYY-MM-DD | No | Filter by week end date (range end) | `2025-01-20` |
| `project_id` | UUID | No | Filter by project ID | `e344768c-d673-469b-a141-b4a01fa3c603` |
| `task_id` | UUID or null | No | Filter by task ID (use null for entries without tasks) | `a1b2c3d4-...` |
| `day_of_week` | 0-6 | No | Filter by day of week (0=Sunday, 6=Saturday) | `1` |
| `tenant_id` | UUID | No | Filter by tenant ID | `5541fadb-ac76-4ade-b777-ee496f5c20fa` |
| `page` | Integer | No | Page number (default: 1) | `1` |
| `limit` | Integer | No | Items per page (default: 20, max: 100) | `50` |
| `sort` | String | No | Sort field and order | `created_at:desc` |

#### Filtering Patterns

##### 1. Filter by User for a Specific Week (Exact Match)
Get all time entries for a user in a specific week:

```bash
GET /api/v1/time-entries?user_id=00000000-0000-0000-0000-000000000002&week_start_date=2025-01-06
```

**Use case:** Display a user's timesheet for the current week.

##### 2. Filter by User for a Date Range (NEW)
Get all time entries for a user across multiple weeks:

```bash
GET /api/v1/time-entries?user_id=00000000-0000-0000-0000-000000000002&week_start_date=2025-01-06&week_end_date=2025-01-27
```

**Use case:** Display a user's timesheet for a month or custom date range.

**How it works:**
- If both `week_start_date` and `week_end_date` are provided, the API returns all time entries where `week_start_date >= start AND week_start_date <= end`
- If only `week_start_date` is provided, it returns entries with exact match (backward compatible)
- If only `week_end_date` is provided, it returns all entries up to that date

##### 3. Filter by Project
Get all time entries for a specific project:

```bash
GET /api/v1/time-entries?project_id=e344768c-d673-469b-a141-b4a01fa3c603
```

**Use case:** Project hours reporting.

##### 4. Filter by Day of Week
Get all Monday entries for a user:

```bash
GET /api/v1/time-entries?user_id=00000000-0000-0000-0000-000000000002&day_of_week=1
```

**Use case:** Analyze time patterns by day.

##### 5. Combined Filters with Pagination
Complex filtering with pagination:

```bash
GET /api/v1/time-entries?user_id=00000000-0000-0000-0000-000000000002&project_id=e344768c-d673-469b-a141-b4a01fa3c603&week_start_date=2025-01-06&week_end_date=2025-01-27&page=1&limit=50&sort=week_start_date:desc
```

#### Response Format

```json
{
  "data": [
    {
      "id": "c650620b-cadc-40a4-8455-afc0d1bca86b",
      "tenantId": "5541fadb-ac76-4ade-b777-ee496f5c20fa",
      "userId": "00000000-0000-0000-0000-000000000002",
      "projectId": "e344768c-d673-469b-a141-b4a01fa3c603",
      "taskId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "weekStartDate": "2025-01-06T00:00:00.000Z",
      "dayOfWeek": 1,
      "hours": "8.50",
      "note": "Worked on feature implementation",
      "createdAt": "2025-01-06T10:30:00.000Z",
      "updatedAt": "2025-01-06T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

#### Sorting Options

Valid sort fields:
- `id`
- `week_start_date` (most commonly used)
- `day_of_week`
- `hours`
- `created_at`
- `user_id`
- `project_id`

Format: `field:order` where order is `asc` or `desc`

Examples:
- `week_start_date:asc` - Oldest weeks first
- `week_start_date:desc` - Newest weeks first
- `hours:desc` - Highest hours first

### POST /api/v1/time-entries

Create a new time entry.

**Request:**
```json
{
  "tenant_id": "5541fadb-ac76-4ade-b777-ee496f5c20fa",
  "user_id": "00000000-0000-0000-0000-000000000002",
  "project_id": "e344768c-d673-469b-a141-b4a01fa3c603",
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "week_start_date": "2025-01-06",
  "day_of_week": 1,
  "hours": 8.5,
  "note": "Optional note about the work"
}
```

**Validation Rules:**
- `hours` must be >= 0
- `day_of_week` must be 0-6 (0=Sunday, 6=Saturday)
- `week_start_date` must be a valid ISO date
- Unique constraint: One entry per (tenant, user, project, task, week, day) combination

**Response:** Returns the created time entry object.

### PATCH /api/v1/time-entries/:id

Update an existing time entry. Only `hours` and `note` can be updated.

**Request:**
```json
{
  "hours": 7.5,
  "note": "Updated note"
}
```

### DELETE /api/v1/time-entries/:id

Delete a time entry by ID.

**Response:** 204 No Content on success.

### GET /api/v1/time-entries/stats/weekly/:userId/:weekStartDate

Get total hours for a user in a specific week.

**Example:**
```bash
GET /api/v1/time-entries/stats/weekly/00000000-0000-0000-0000-000000000002/2025-01-06
```

**Response:**
```json
{
  "userId": "00000000-0000-0000-0000-000000000002",
  "weekStartDate": "2025-01-06",
  "totalHours": 40.5
}
```

**Use case:** Display weekly total hours in timesheet header.

### GET /api/v1/time-entries/stats/project/:projectId

Get total hours logged to a project.

**Example:**
```bash
GET /api/v1/time-entries/stats/project/e344768c-d673-469b-a141-b4a01fa3c603
```

**Response:**
```json
{
  "projectId": "e344768c-d673-469b-a141-b4a01fa3c603",
  "totalHours": 256.5
}
```

---

## Tasks API

### GET /api/v1/tasks

Retrieve tasks with filtering and pagination.

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `project_id` | UUID | No | Filter tasks by project | `e344768c-d673-469b-a141-b4a01fa3c603` |
| `tenant_id` | UUID | No | Filter by tenant ID | `5541fadb-ac76-4ade-b777-ee496f5c20fa` |
| `parent_task_id` | UUID or null | No | Filter by parent task (null for root tasks) | `a1b2c3d4-...` |
| `search` | String | No | Search tasks by name | `API` |
| `page` | Integer | No | Page number (default: 1) | `1` |
| `limit` | Integer | No | Items per page (default: 20, max: 100) | `50` |
| `sort` | String | No | Sort field and order | `name:asc` |

#### Common Use Cases

##### 1. Get All Tasks for a Project
```bash
GET /api/v1/tasks?project_id=e344768c-d673-469b-a141-b4a01fa3c603
```

**Use case:** Populate task dropdown when user selects a project in timesheet form.

##### 2. Search Tasks by Name
```bash
GET /api/v1/tasks?project_id=e344768c-d673-469b-a141-b4a01fa3c603&search=API
```

**Use case:** Autocomplete for task selection.

##### 3. Get Root Tasks Only
```bash
GET /api/v1/tasks?project_id=e344768c-d673-469b-a141-b4a01fa3c603&parent_task_id=null
```

**Use case:** Display hierarchical task structure.

#### Response Format

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "tenantId": "5541fadb-ac76-4ade-b777-ee496f5c20fa",
      "projectId": "e344768c-d673-469b-a141-b4a01fa3c603",
      "name": "Backend API Development",
      "parentTaskId": null
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "tenantId": "5541fadb-ac76-4ade-b777-ee496f5c20fa",
      "projectId": "e344768c-d673-469b-a141-b4a01fa3c603",
      "name": "Authentication Module",
      "parentTaskId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

### Search API Alternative

For faster task searches, use the dedicated search endpoint:

```bash
GET /api/v1/search/tasks?q=API&project_id=e344768c-d673-469b-a141-b4a01fa3c603&limit=10
```

**Use case:** Real-time search as user types.

---

## Common Patterns

### Typical Timesheet Workflow

1. **User selects week:** Frontend determines `week_start_date` (e.g., "2025-01-06")

2. **Fetch existing time entries for the week:**
   ```bash
   GET /api/v1/time-entries?user_id={userId}&week_start_date=2025-01-06
   ```

3. **Fetch user's projects:**
   ```bash
   GET /api/v1/my/projects
   ```

4. **User selects project, fetch tasks:**
   ```bash
   GET /api/v1/tasks?project_id={projectId}
   ```

5. **User enters hours, create time entry:**
   ```bash
   POST /api/v1/time-entries
   {
     "tenant_id": "{tenantId}",
     "user_id": "{userId}",
     "project_id": "{projectId}",
     "task_id": "{taskId}",
     "week_start_date": "2025-01-06",
     "day_of_week": 1,
     "hours": 8.5
   }
   ```

6. **Fetch updated weekly total:**
   ```bash
   GET /api/v1/time-entries/stats/weekly/{userId}/2025-01-06
   ```

### Multi-Week View Pattern (NEW)

For calendar or multi-week views:

1. **Determine date range:** e.g., January 2025 = "2025-01-01" to "2025-01-31"

2. **Fetch all time entries in range:**
   ```bash
   GET /api/v1/time-entries?user_id={userId}&week_start_date=2025-01-01&week_end_date=2025-01-31
   ```

3. **Group by week in frontend:** Organize entries by `weekStartDate`

4. **Display totals per week**

### Performance Considerations

1. **Always filter by userId** when fetching time entries to avoid loading all data
2. **Use date ranges** when appropriate to reduce query time
3. **Set appropriate page limits** (default 20 is good for most UIs)
4. **Cache project and task lists** as they don't change frequently
5. **Use the search endpoint** for autocomplete/typeahead features

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
Invalid query parameters or validation error.

```json
{
  "message": "Invalid date format",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Frontend action:** Display validation error to user, highlight invalid field.

#### 401 Unauthorized
Invalid or expired session token.

```json
{
  "message": "Invalid or expired session token",
  "error": "Unauthorized",
  "statusCode": 401
}
```

**Frontend action:** Redirect to login page, clear stored token.

#### 404 Not Found
Resource not found.

```json
{
  "message": "Time entry with ID {id} not found",
  "error": "Not Found",
  "statusCode": 404
}
```

**Frontend action:** Show "not found" message, refresh list.

#### 409 Conflict
Duplicate entry (violates unique constraint).

```json
{
  "message": "Time entry already exists for this user, project, task, week, and day combination",
  "error": "Conflict",
  "statusCode": 409
}
```

**Frontend action:** Show error, suggest updating existing entry instead.

### Error Handling Best Practices

```typescript
try {
  const response = await fetch('/api/v1/time-entries', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify(timeEntry)
  });

  if (!response.ok) {
    const error = await response.json();

    switch (response.status) {
      case 401:
        // Redirect to login
        window.location.href = '/login';
        break;
      case 409:
        // Show conflict message
        showError('Entry already exists for this day');
        break;
      default:
        showError(error.message || 'An error occurred');
    }

    return;
  }

  const data = await response.json();
  // Handle success
} catch (error) {
  // Network error
  showError('Unable to connect to server');
}
```

---

## Additional Resources

- **OpenAPI Spec:** `/api-json` (Swagger UI at `/api`)
- **Health Check:** `GET /api/v1/health`
- **User Context:** `GET /api/v1/auth/me` (get current user, tenant, permissions)

---

## Change Log

### 2025-10-27
- Added `week_end_date` parameter to `/time-entries` endpoint for date range filtering
- Updated documentation with date range filtering patterns
- Added multi-week view workflow example

### Initial Release
- Time entries CRUD operations
- Tasks filtering by project
- Weekly hours statistics
- Project hours statistics
