# Frontend API Reference: Weekly Timesheet Management

**Last Updated:** 2025-10-28
**Base URL:** `/api/v1`
**Authentication:** All endpoints require Bearer token in `Authorization` header

---

## Table of Contents

- [User Stories to API Mapping](#user-stories-to-api-mapping)
- [Complete API Reference](#complete-api-reference)
- [Integration Examples](#integration-examples)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## User Stories to API Mapping

### Epic 1: View Weekly Timesheet

| User Story | API Endpoint | Method | Notes |
|------------|--------------|--------|-------|
| US-001: View Current Week | `GET /time-entries/week/:userId/:weekStartDate` | GET | **New** - Single call for all week data |
| US-001: Get Week Policy | `GET /timesheet-policies/:tenantId` | GET | For week_start configuration |
| US-002: Navigate Weeks | `GET /time-entries/week/:userId/:weekStartDate` | GET | Change weekStartDate parameter |
| US-002: Jump to Current | `GET /timesheets/my-current` | GET | **New** - Auto-creates if missing |
| US-003: View Status | `GET /timesheets/:id` | GET | Includes status, timestamps, reviewer |

### Epic 2: Log Time Entries

| User Story | API Endpoint | Method | Notes |
|------------|--------------|--------|-------|
| US-004: Add Single Entry | `POST /time-entries` | POST | **Enhanced** - Now validates membership |
| US-004: Get My Projects | `GET /my/projects` | GET | Only shows assigned projects |
| US-004: Search Projects | `GET /search/projects?q=term&limit=10` | GET | Typeahead search |
| US-004: Search Tasks | `GET /search/tasks?q=term&project_id=xxx` | GET | Filtered by project |
| US-005: Edit Entry | `PATCH /time-entries/:id` | PATCH | **Enhanced** - Status locking enforced |
| US-006: Delete Entry | `DELETE /time-entries/:id` | DELETE | **Enhanced** - Status locking enforced |
| US-008: Bulk Fill Week | `POST /time-entries/bulk` | POST | **New** - Atomic bulk operation |
| US-009: Copy Previous Week | `POST /time-entries/copy-week` | POST | **New** - One-click copy |
| US-010: Validate Hours | `POST /timesheets/:id/validate` | POST | **New** - Pre-submission check |

### Epic 3: Submit & Approve

| User Story | API Endpoint | Method | Notes |
|------------|--------------|--------|-------|
| US-011: Submit Timesheet | `POST /timesheets/:id/submit` | POST | Requires validation first |
| US-012: Recall Timesheet | `POST /timesheets/:id/recall` | POST | **New** - Before review only |
| US-013: View Rejection | `GET /timesheets/:id` | GET | review_note field |
| US-014: Approve (Manager) | `POST /timesheets/:id/approve` | POST | Optional comment |
| US-015: Reject (Manager) | `POST /timesheets/:id/reject` | POST | Required comment |
| US-015: List Team Pending | `GET /timesheets?team=true&status=pending` | GET | Manager view |

### Epic 4: Project & Task Selection

| User Story | API Endpoint | Method | Notes |
|------------|--------------|--------|-------|
| US-016: View Assigned | `GET /my/projects` | GET | User's project memberships |
| US-017: Search Projects | `GET /search/projects?q=term` | GET | With debounce |
| US-018: Search Tasks | `GET /search/tasks?project_id=xxx&q=term` | GET | Project-filtered |

### Epic 5: UX Enhancements

| User Story | API Endpoint | Method | Notes |
|------------|--------------|--------|-------|
| US-020: Inline Edit | `PATCH /time-entries/:id` | PATCH | Optimistic UI update |
| US-022: Daily Totals | `GET /time-entries/week/:userId/:weekStartDate` | GET | Included in daily_totals |
| US-023: Weekly Total | `GET /time-entries/week/:userId/:weekStartDate` | GET | Included in weekly_total |
| US-024: Project Breakdown | `GET /time-entries/week/:userId/:weekStartDate` | GET | Included in by_project |

### Epic 6: Reporting

| User Story | API Endpoint | Method | Notes |
|------------|--------------|--------|-------|
| US-028: Monthly Summary | `GET /timesheets?user_id=xxx&from=2025-01-01&to=2025-01-31` | GET | Date range filter |
| US-030: Calendar View | `GET /calendar?from=2025-01-01&to=2025-01-31&include=holidays,leave,timesheets` | GET | Unified view |

---

## Complete API Reference

### 🆕 GET /time-entries/week/:userId/:weekStartDate

**Get complete week view for timesheet grid**

**URL Parameters:**
- `userId` (string, UUID) - User ID
- `weekStartDate` (string, YYYY-MM-DD) - Week start date

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response: 200 OK**
```json
{
  "week_start_date": "2025-01-20",
  "week_end_date": "2025-01-26",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "entries": [
    {
      "id": "entry-uuid-1",
      "project_id": "project-uuid-1",
      "project_name": "Project Alpha",
      "project_code": "ALPHA",
      "task_id": "task-uuid-1",
      "task_name": "Backend Development",
      "day_of_week": 1,
      "date": "2025-01-20",
      "hours": 8.0,
      "note": "API implementation"
    }
  ],
  "daily_totals": [0, 8, 7.5, 8, 8, 6.5, 0],
  "weekly_total": 38,
  "by_project": {
    "project-uuid-1": {
      "project_name": "Project Alpha",
      "project_code": "ALPHA",
      "hours": 20.5
    }
  },
  "timesheet": {
    "id": "timesheet-uuid-1",
    "status": "draft",
    "submitted_at": null,
    "reviewed_at": null
  }
}
```

**Use Case:**
- **Initial page load** - Single API call to get all week data
- **Week navigation** - Change weekStartDate to load different week
- **Refresh after edit** - Reload to get updated totals

**Example Usage:**
```typescript
// React example
const fetchWeekView = async (userId: string, weekStart: string) => {
  const response = await fetch(
    `/api/v1/time-entries/week/${userId}/${weekStart}`,
    {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    }
  );
  return response.json();
};
```

---

### 🆕 POST /time-entries/bulk

**Bulk create or update multiple time entries**

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "week_start_date": "2025-01-20",
  "entries": [
    {
      "project_id": "project-uuid-1",
      "task_id": "task-uuid-1",
      "day_of_week": 1,
      "hours": 8,
      "note": "Backend development"
    },
    {
      "project_id": "project-uuid-1",
      "task_id": "task-uuid-1",
      "day_of_week": 2,
      "hours": 8,
      "note": "Backend development"
    }
  ]
}
```

**Response: 200 OK**
```json
{
  "created": [
    {
      "id": "entry-uuid-1",
      "project_id": "project-uuid-1",
      "hours": 8
    }
  ],
  "updated": [
    {
      "id": "entry-uuid-2",
      "project_id": "project-uuid-1",
      "hours": 8
    }
  ],
  "errors": [
    {
      "day_of_week": 3,
      "project_id": "project-uuid-1",
      "error": "User is not a member of project"
    }
  ],
  "summary": {
    "created_count": 1,
    "updated_count": 1,
    "error_count": 1,
    "total_requested": 3
  }
}
```

**Use Cases:**
- **Fill entire week** - User selects project and fills Mon-Fri with same hours
- **Bulk edit** - Update multiple days at once
- **Import/Paste** - Paste timesheet data from spreadsheet

**Validation:**
- ✅ Validates project membership
- ✅ Checks timesheet is editable (draft/rejected only)
- ✅ Atomic operation - all succeed or all fail
- ✅ Auto-upsert - creates new or updates existing

**Example Usage:**
```typescript
// Fill Mon-Fri with 8 hours for same project
const fillWeek = async (userId: string, projectId: string, taskId: string, weekStart: string) => {
  const entries = [1, 2, 3, 4, 5].map(day => ({
    project_id: projectId,
    task_id: taskId,
    day_of_week: day,
    hours: 8,
    note: null
  }));

  const response = await fetch('/api/v1/time-entries/bulk', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: userId,
      week_start_date: weekStart,
      entries
    })
  });

  return response.json();
};
```

---

### 🆕 POST /time-entries/copy-week

**Copy all time entries from one week to another**

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "from_week_start": "2025-01-13",
  "to_week_start": "2025-01-20",
  "overwrite_existing": false,
  "copy_notes": false
}
```

**Response: 200 OK**
```json
{
  "copied_count": 25,
  "skipped_count": 3,
  "overwritten_count": 0,
  "entries": [
    {
      "id": "new-entry-uuid-1",
      "project_id": "project-uuid-1",
      "day_of_week": 1,
      "hours": 8
    }
  ],
  "skipped": [
    {
      "day_of_week": 1,
      "project_id": "project-uuid-2",
      "reason": "Entry already exists"
    }
  ]
}
```

**Use Cases:**
- **Copy last week** - Replicate regular schedule
- **Template application** - Apply saved timesheet pattern
- **Quick start** - Pre-fill current week from previous

**Options:**
- `overwrite_existing: false` - Skip existing entries (default)
- `overwrite_existing: true` - Replace existing entries
- `copy_notes: false` - Don't copy notes (default)
- `copy_notes: true` - Copy notes too

**Example Usage:**
```typescript
// Copy previous week button
const copyPreviousWeek = async (userId: string, currentWeekStart: string) => {
  const previousWeek = new Date(currentWeekStart);
  previousWeek.setDate(previousWeek.getDate() - 7);

  const response = await fetch('/api/v1/time-entries/copy-week', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: userId,
      from_week_start: previousWeek.toISOString().split('T')[0],
      to_week_start: currentWeekStart,
      overwrite_existing: false,
      copy_notes: false
    })
  });

  return response.json();
};
```

---

### 🆕 POST /timesheets/:id/validate

**Validate timesheet against policy rules**

**URL Parameters:**
- `id` (string, UUID) - Timesheet ID

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response: 200 OK**
```json
{
  "valid": false,
  "errors": [
    {
      "type": "max_hours_exceeded",
      "severity": "error",
      "message": "Monday exceeds maximum 8 hours per day (logged: 10)",
      "day_of_week": 1,
      "date": "2025-01-20",
      "hours": 10,
      "max_allowed": 8
    }
  ],
  "warnings": [
    {
      "type": "no_entries",
      "severity": "warning",
      "message": "No time entries for Wednesday",
      "day_of_week": 3,
      "date": "2025-01-22"
    }
  ],
  "summary": {
    "total_hours": 38,
    "days_with_entries": 5,
    "entry_count": 25,
    "project_count": 3,
    "status": "draft"
  }
}
```

**Use Cases:**
- **Pre-submission check** - Validate before submit button
- **Real-time validation** - Check as user edits
- **Policy enforcement** - Prevent invalid submissions

**Error Types:**
- `max_hours_exceeded` - Daily hours exceed policy limit
- `invalid_project` - Not member of project
- `timesheet_locked` - Can't edit submitted/approved

**Warning Types:**
- `no_entries` - Day has no logged time
- `low_hours` - Weekly total below expected

**Example Usage:**
```typescript
// Validate before submit
const validateBeforeSubmit = async (timesheetId: string) => {
  const response = await fetch(`/api/v1/timesheets/${timesheetId}/validate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  });

  const validation = await response.json();

  if (!validation.valid) {
    // Show errors to user
    console.error('Validation errors:', validation.errors);
    return false;
  }

  // Show warnings but allow submit
  if (validation.warnings.length > 0) {
    console.warn('Validation warnings:', validation.warnings);
  }

  return true;
};
```

---

### 🆕 POST /timesheets/:id/recall

**Recall submitted timesheet back to draft**

**URL Parameters:**
- `id` (string, UUID) - Timesheet ID

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response: 200 OK**
```json
{
  "id": "timesheet-uuid-1",
  "status": "draft",
  "previous_status": "submitted",
  "recalled_at": "2025-01-21T10:30:00Z",
  "recalled_by_user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response: 400 Bad Request**
```json
{
  "error": "Bad Request",
  "message": "Cannot recall timesheet that has been reviewed",
  "statusCode": 400
}
```

**Use Cases:**
- **Fix mistakes** - User submitted too early, needs to edit
- **Add missing hours** - Forgot to log Friday before submit
- **Change entries** - Manager asked for corrections

**Constraints:**
- ✅ Only owner can recall their timesheet
- ✅ Can only recall from "submitted" status
- ✅ Cannot recall after approval/rejection
- ✅ Cannot recall if already reviewed

**Example Usage:**
```typescript
// Recall button in submitted state
const recallTimesheet = async (timesheetId: string) => {
  try {
    const response = await fetch(`/api/v1/timesheets/${timesheetId}/recall`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.message);
      return null;
    }

    const result = await response.json();
    console.log('Timesheet recalled:', result);
    return result;
  } catch (error) {
    console.error('Failed to recall:', error);
    return null;
  }
};
```

---

### 🆕 GET /timesheets/my-current

**Get or create current week's timesheet**

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "timesheet-uuid-1",
    "tenant_id": "tenant-uuid-1",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "week_start_date": "2025-01-20",
    "status": "draft",
    "submitted_at": null,
    "reviewed_at": null,
    "created_at": "2025-01-20T08:00:00Z",
    "updated_at": "2025-01-20T08:00:00Z",
    "auto_created": true
  }
}
```

**Use Cases:**
- **Jump to current week** - Navigation button
- **Initial app load** - Show current week by default
- **Lazy creation** - Auto-create timesheet when accessed

**Behavior:**
- If timesheet exists → returns it
- If timesheet missing → creates draft and returns it
- `auto_created: true` indicates it was just created

**Example Usage:**
```typescript
// "View Current Week" button
const goToCurrentWeek = async () => {
  const response = await fetch('/api/v1/timesheets/my-current', {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  });

  const { data } = await response.json();

  // Navigate to week view with this timesheet
  navigateToWeek(data.week_start_date);
};
```

---

### ✅ POST /time-entries

**Create single time entry** *(Enhanced with validation)*

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "tenant_id": "tenant-uuid-1",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "project_id": "project-uuid-1",
  "task_id": "task-uuid-1",
  "week_start_date": "2025-01-20",
  "day_of_week": 1,
  "hours": 8,
  "note": "Backend API work"
}
```

**Response: 201 Created**
```json
{
  "id": "entry-uuid-1",
  "tenant_id": "tenant-uuid-1",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "project_id": "project-uuid-1",
  "task_id": "task-uuid-1",
  "week_start_date": "2025-01-20",
  "day_of_week": 1,
  "hours": "8",
  "note": "Backend API work",
  "created_at": "2025-01-20T09:00:00Z",
  "updated_at": "2025-01-20T09:00:00Z"
}
```

**Response: 403 Forbidden** *(New validation)*
```json
{
  "error": "Forbidden",
  "message": "User is not a member of project project-uuid-1",
  "statusCode": 403
}
```

**Response: 403 Forbidden** *(New validation)*
```json
{
  "error": "Forbidden",
  "message": "Cannot modify time entries. Timesheet status is submitted",
  "statusCode": 403
}
```

**Validations Added:**
- ✅ **Project membership** - User must be assigned to project
- ✅ **Timesheet status** - Can only edit draft/rejected

---

### ✅ PATCH /time-entries/:id

**Update time entry** *(Enhanced with validation)*

**URL Parameters:**
- `id` (string, UUID) - Time entry ID

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "hours": 7.5,
  "note": "Updated note"
}
```

**Response: 200 OK**
```json
{
  "id": "entry-uuid-1",
  "hours": "7.5",
  "note": "Updated note",
  "updated_at": "2025-01-20T14:30:00Z"
}
```

**Response: 403 Forbidden** *(New validation)*
```json
{
  "error": "Forbidden",
  "message": "Cannot modify time entries. Timesheet status is approved",
  "statusCode": 403
}
```

**Validations Added:**
- ✅ **Timesheet status** - Can only edit draft/rejected
- ⚠️ Cannot change project/task/day - must delete and recreate

---

### ✅ DELETE /time-entries/:id

**Delete time entry** *(Enhanced with validation)*

**URL Parameters:**
- `id` (string, UUID) - Time entry ID

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response: 204 No Content**

**Response: 403 Forbidden** *(New validation)*
```json
{
  "error": "Forbidden",
  "message": "Cannot modify time entries. Timesheet status is approved",
  "statusCode": 403
}
```

**Validations Added:**
- ✅ **Timesheet status** - Can only delete from draft/rejected

---

### ✅ GET /my/projects

**Get user's assigned projects**

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response: 200 OK**
```json
{
  "data": [
    {
      "id": "project-uuid-1",
      "name": "Project Alpha",
      "code": "ALPHA",
      "active": true,
      "role": "member",
      "assigned_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

**Use Cases:**
- **Project dropdown** - Show only projects user can log time to
- **Filter time entries** - Limit to assigned projects
- **Validation** - Check if user can create entry

---

### ✅ GET /search/projects

**Search projects by name or code**

**Query Parameters:**
- `q` (string) - Search term
- `limit` (number, optional) - Max results (default: 10)

**Headers:**
```
Authorization: Bearer <session_token>
```

**Request Example:**
```
GET /api/v1/search/projects?q=alpha&limit=5
```

**Response: 200 OK**
```json
[
  {
    "id": "project-uuid-1",
    "name": "Project Alpha",
    "code": "ALPHA",
    "active": true
  },
  {
    "id": "project-uuid-2",
    "name": "Alpha Phase 2",
    "code": "ALPHA2",
    "active": true
  }
]
```

**Use Cases:**
- **Typeahead search** - Auto-complete project picker
- **Quick find** - Search in large project list

**Example with Debounce:**
```typescript
import { debounce } from 'lodash';

const searchProjects = debounce(async (query: string) => {
  if (query.length < 2) return [];

  const response = await fetch(
    `/api/v1/search/projects?q=${encodeURIComponent(query)}&limit=10`,
    {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    }
  );

  return response.json();
}, 300);
```

---

### ✅ GET /search/tasks

**Search tasks by name**

**Query Parameters:**
- `q` (string) - Search term
- `project_id` (string, UUID, optional) - Filter by project
- `limit` (number, optional) - Max results (default: 10)

**Headers:**
```
Authorization: Bearer <session_token>
```

**Request Example:**
```
GET /api/v1/search/tasks?q=backend&project_id=project-uuid-1&limit=5
```

**Response: 200 OK**
```json
[
  {
    "id": "task-uuid-1",
    "name": "Backend Development",
    "project_id": "project-uuid-1"
  }
]
```

---

### ✅ GET /timesheets

**List timesheets with filters**

**Query Parameters:**
- `user_id` (string, UUID, optional) - Filter by user
- `week_start` (string, YYYY-MM-DD, optional) - Specific week
- `status` (string, optional) - Filter by status (draft|submitted|approved|rejected)
- `team` (boolean, optional) - If true, show direct reports
- `from` (string, YYYY-MM-DD, optional) - Date range start
- `to` (string, YYYY-MM-DD, optional) - Date range end
- `page` (number, optional) - Page number (default: 1)
- `page_size` (number, optional) - Items per page (default: 20)

**Headers:**
```
Authorization: Bearer <session_token>
```

**Request Examples:**
```
GET /api/v1/timesheets?user_id=550e8400-e29b-41d4-a716-446655440000&status=draft
GET /api/v1/timesheets?team=true&status=pending
GET /api/v1/timesheets?from=2025-01-01&to=2025-01-31
```

**Response: 200 OK**
```json
{
  "data": [
    {
      "id": "timesheet-uuid-1",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "week_start_date": "2025-01-20",
      "status": "draft",
      "total_hours": 38,
      "submitted_at": null,
      "reviewed_at": null,
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 42
}
```

---

### ✅ GET /timesheets/:id

**Get single timesheet with time entries**

**URL Parameters:**
- `id` (string, UUID) - Timesheet ID

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "timesheet-uuid-1",
    "tenant_id": "tenant-uuid-1",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "week_start_date": "2025-01-20",
    "status": "rejected",
    "submitted_at": "2025-01-24T17:00:00Z",
    "reviewed_at": "2025-01-25T09:00:00Z",
    "review_note": "Please add notes to Friday entries",
    "submitted_by_user_id": "550e8400-e29b-41d4-a716-446655440000",
    "reviewed_by_user_id": "manager-uuid-1",
    "created_at": "2025-01-20T08:00:00Z",
    "updated_at": "2025-01-25T09:00:00Z",
    "time_entries": [
      {
        "id": "entry-uuid-1",
        "project_id": "project-uuid-1",
        "hours": "8",
        "day_of_week": 1
      }
    ]
  }
}
```

---

### ✅ POST /timesheets/:id/submit

**Submit timesheet for approval**

**URL Parameters:**
- `id` (string, UUID) - Timesheet ID

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "timesheet-uuid-1",
    "status": "submitted",
    "submitted_at": "2025-01-24T17:00:00Z",
    "submitted_by_user_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Recommended Flow:**
```typescript
// 1. Validate first
const validation = await fetch(`/api/v1/timesheets/${id}/validate`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

if (!validation.valid) {
  alert('Please fix errors before submitting');
  return;
}

// 2. Submit
const result = await fetch(`/api/v1/timesheets/${id}/submit`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log('Submitted:', result);
```

---

### ✅ POST /timesheets/:id/approve

**Approve timesheet (Manager/Admin)**

**URL Parameters:**
- `id` (string, UUID) - Timesheet ID

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reviewNote": "Looks good!"
}
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "timesheet-uuid-1",
    "status": "approved",
    "reviewed_at": "2025-01-25T09:00:00Z",
    "reviewed_by_user_id": "manager-uuid-1",
    "review_note": "Looks good!"
  }
}
```

---

### ✅ POST /timesheets/:id/reject

**Reject timesheet (Manager/Admin)**

**URL Parameters:**
- `id` (string, UUID) - Timesheet ID

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reviewNote": "Please add notes to Friday entries"
}
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "timesheet-uuid-1",
    "status": "rejected",
    "reviewed_at": "2025-01-25T09:00:00Z",
    "reviewed_by_user_id": "manager-uuid-1",
    "review_note": "Please add notes to Friday entries"
  }
}
```

---

### ✅ GET /timesheet-policies/:tenantId

**Get tenant's timesheet policy**

**URL Parameters:**
- `tenantId` (string, UUID) - Tenant ID

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response: 200 OK**
```json
{
  "tenant_id": "tenant-uuid-1",
  "week_start": 1,
  "max_hours_per_day": 8,
  "allow_overtime": true,
  "lock_after_approval": true
}
```

**Use Cases:**
- **Configure week grid** - Use week_start (0=Sunday, 1=Monday)
- **Validation** - Check against max_hours_per_day
- **UI behavior** - Show overtime warnings

---

### ✅ GET /calendar

**Unified calendar view**

**Query Parameters:**
- `user_id` (string, UUID, optional) - Defaults to current user
- `from` (string, YYYY-MM-DD, required) - Start date
- `to` (string, YYYY-MM-DD, required) - End date
- `include` (string, optional) - Comma-separated: holidays,leave,timesheets

**Headers:**
```
Authorization: Bearer <session_token>
```

**Request Example:**
```
GET /api/v1/calendar?from=2025-01-01&to=2025-01-31&include=holidays,leave,timesheets
```

**Response: 200 OK**
```json
{
  "from": "2025-01-01",
  "to": "2025-01-31",
  "events": [
    {
      "type": "holiday",
      "date": "2025-01-01",
      "name": "New Year's Day"
    },
    {
      "type": "leave",
      "date": "2025-01-15",
      "status": "approved",
      "benefit_type": "PTO"
    },
    {
      "type": "timesheet",
      "week_start_date": "2025-01-20",
      "status": "approved",
      "total_hours": 40
    }
  ]
}
```

---

## Integration Examples

### Complete Weekly Timesheet Page

```typescript
import React, { useState, useEffect } from 'react';

interface WeekViewData {
  week_start_date: string;
  entries: TimeEntry[];
  daily_totals: number[];
  weekly_total: number;
  timesheet: Timesheet | null;
}

const WeeklyTimesheetPage = () => {
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart());
  const [weekData, setWeekData] = useState<WeekViewData | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Load week data
  useEffect(() => {
    loadWeekData(weekStart);
  }, [weekStart]);

  const loadWeekData = async (date: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/time-entries/week/${currentUser.id}/${date}`,
        {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }
      );
      const data = await response.json();
      setWeekData(data);
    } catch (error) {
      console.error('Failed to load week:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Add/Edit entry
  const saveEntry = async (entry: TimeEntryInput) => {
    if (entry.id) {
      // Update existing
      await fetch(`/api/v1/time-entries/${entry.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hours: entry.hours,
          note: entry.note
        })
      });
    } else {
      // Create new
      await fetch('/api/v1/time-entries', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: currentUser.tenant_id,
          user_id: currentUser.id,
          project_id: entry.project_id,
          task_id: entry.task_id,
          week_start_date: weekStart,
          day_of_week: entry.day_of_week,
          hours: entry.hours,
          note: entry.note
        })
      });
    }

    // Reload week data
    await loadWeekData(weekStart);
  };

  // 3. Fill entire week
  const fillWeek = async (projectId: string, taskId: string, hours: number) => {
    const entries = [1, 2, 3, 4, 5].map(day => ({
      project_id: projectId,
      task_id: taskId,
      day_of_week: day,
      hours: hours,
      note: null
    }));

    await fetch('/api/v1/time-entries/bulk', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        week_start_date: weekStart,
        entries
      })
    });

    await loadWeekData(weekStart);
  };

  // 4. Copy previous week
  const copyPreviousWeek = async () => {
    const previousWeek = getPreviousWeekStart(weekStart);

    await fetch('/api/v1/time-entries/copy-week', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        from_week_start: previousWeek,
        to_week_start: weekStart,
        overwrite_existing: false,
        copy_notes: false
      })
    });

    await loadWeekData(weekStart);
  };

  // 5. Submit timesheet
  const submitTimesheet = async () => {
    if (!weekData?.timesheet) return;

    // Validate first
    const validation = await fetch(
      `/api/v1/timesheets/${weekData.timesheet.id}/validate`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      }
    ).then(r => r.json());

    if (!validation.valid) {
      alert('Please fix errors: ' + validation.errors.map(e => e.message).join(', '));
      return;
    }

    // Submit
    await fetch(`/api/v1/timesheets/${weekData.timesheet.id}/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });

    await loadWeekData(weekStart);
  };

  // 6. Navigate weeks
  const goToPreviousWeek = () => {
    setWeekStart(getPreviousWeekStart(weekStart));
  };

  const goToNextWeek = () => {
    setWeekStart(getNextWeekStart(weekStart));
  };

  const goToCurrentWeek = async () => {
    const response = await fetch('/api/v1/timesheets/my-current', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    }).then(r => r.json());

    setWeekStart(response.data.week_start_date);
  };

  return (
    <div>
      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={goToPreviousWeek}>← Previous Week</button>
        <button onClick={goToCurrentWeek}>Current Week</button>
        <button onClick={goToNextWeek}>Next Week →</button>
      </div>

      {/* Week header */}
      <h2>Week of {weekStart}</h2>
      <p>Total: {weekData?.weekly_total || 0} hours</p>
      <p>Status: {weekData?.timesheet?.status || 'No timesheet'}</p>

      {/* Actions */}
      <div>
        <button onClick={copyPreviousWeek}>Copy Previous Week</button>
        <button onClick={() => fillWeek(selectedProject, selectedTask, 8)}>
          Fill Week (8h/day)
        </button>
        <button onClick={submitTimesheet}>Submit for Approval</button>
      </div>

      {/* Grid */}
      <WeekGrid
        entries={weekData?.entries || []}
        dailyTotals={weekData?.daily_totals || []}
        onSaveEntry={saveEntry}
        editable={weekData?.timesheet?.status === 'draft'}
      />
    </div>
  );
};
```

---

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired session token",
  "statusCode": 401
}
```
**Action:** Redirect to login page

#### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "User is not a member of project project-uuid-1",
  "statusCode": 403
}
```
**Action:** Show error message, prevent action

#### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "hours must be between 0 and 24",
  "statusCode": 400
}
```
**Action:** Show validation error inline

#### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Time entry with ID xyz not found",
  "statusCode": 404
}
```
**Action:** Refresh data, show not found message

#### 409 Conflict
```json
{
  "error": "Conflict",
  "message": "Time entry already exists for this user, project, task, week, and day combination",
  "statusCode": 409
}
```
**Action:** Update existing instead of create

---

## Best Practices

### 1. Optimistic UI Updates
```typescript
// Update UI immediately, revert on error
const updateEntry = async (id: string, hours: number) => {
  const originalHours = getEntryHours(id);

  // Optimistic update
  setEntryHours(id, hours);

  try {
    await fetch(`/api/v1/time-entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ hours })
    });
  } catch (error) {
    // Revert on error
    setEntryHours(id, originalHours);
    showError('Failed to update entry');
  }
};
```

### 2. Debounced Search
```typescript
import { debounce } from 'lodash';

const searchProjects = debounce(async (query: string) => {
  const results = await fetch(
    `/api/v1/search/projects?q=${encodeURIComponent(query)}`
  ).then(r => r.json());

  setProjectOptions(results);
}, 300); // Wait 300ms after user stops typing
```

### 3. Polling for Real-Time Updates
```typescript
// Poll for status changes when timesheet is submitted
useEffect(() => {
  if (timesheet?.status !== 'submitted') return;

  const interval = setInterval(async () => {
    const updated = await fetch(`/api/v1/timesheets/${timesheet.id}`)
      .then(r => r.json());

    if (updated.data.status !== 'submitted') {
      // Status changed (approved/rejected)
      setTimesheet(updated.data);
      clearInterval(interval);
    }
  }, 30000); // Poll every 30 seconds

  return () => clearInterval(interval);
}, [timesheet?.status]);
```

### 4. Caching Strategy
```typescript
// Cache timesheet policy (rarely changes)
const getTimesheetPolicy = memoize(async (tenantId: string) => {
  return await fetch(`/api/v1/timesheet-policies/${tenantId}`)
    .then(r => r.json());
});

// Cache my projects (refresh hourly)
const getMyProjects = async () => {
  const cacheKey = 'my-projects';
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < 3600000) { // 1 hour
      return data;
    }
  }

  const projects = await fetch('/api/v1/my/projects')
    .then(r => r.json());

  localStorage.setItem(cacheKey, JSON.stringify({
    data: projects,
    timestamp: Date.now()
  }));

  return projects;
};

// DO NOT cache time entries (always fetch latest)
const getWeekData = async (weekStart: string) => {
  // Always fetch fresh
  return await fetch(`/api/v1/time-entries/week/${userId}/${weekStart}`)
    .then(r => r.json());
};
```

### 5. Validation Before Submit
```typescript
const handleSubmit = async (timesheetId: string) => {
  // Step 1: Validate
  const validation = await fetch(
    `/api/v1/timesheets/${timesheetId}/validate`,
    { method: 'POST' }
  ).then(r => r.json());

  // Step 2: Show errors/warnings
  if (!validation.valid) {
    showErrors(validation.errors);
    return;
  }

  if (validation.warnings.length > 0) {
    const confirmed = confirm(
      `Warnings:\n${validation.warnings.map(w => w.message).join('\n')}\n\nSubmit anyway?`
    );
    if (!confirmed) return;
  }

  // Step 3: Submit
  await fetch(`/api/v1/timesheets/${timesheetId}/submit`, {
    method: 'POST'
  });

  showSuccess('Timesheet submitted for approval');
};
```

### 6. Error Boundary for Failed Requests
```typescript
const withErrorHandling = async <T,>(
  request: () => Promise<T>,
  fallback?: T
): Promise<T | null> => {
  try {
    return await request();
  } catch (error) {
    if (error.status === 401) {
      // Session expired
      redirectToLogin();
    } else if (error.status === 403) {
      showError('You do not have permission for this action');
    } else if (error.status >= 500) {
      showError('Server error. Please try again later.');
    } else {
      showError(error.message || 'An error occurred');
    }
    return fallback || null;
  }
};

// Usage
const weekData = await withErrorHandling(
  () => fetch(`/api/v1/time-entries/week/${userId}/${weekStart}`).then(r => r.json()),
  { entries: [], daily_totals: [0,0,0,0,0,0,0], weekly_total: 0 }
);
```

---

## Quick Reference Table

| Action | Endpoint | Method | New? |
|--------|----------|--------|------|
| View week grid | `/time-entries/week/:userId/:weekStartDate` | GET | ✅ New |
| Add single entry | `/time-entries` | POST | Enhanced |
| Edit entry | `/time-entries/:id` | PATCH | Enhanced |
| Delete entry | `/time-entries/:id` | DELETE | Enhanced |
| Bulk fill week | `/time-entries/bulk` | POST | ✅ New |
| Copy week | `/time-entries/copy-week` | POST | ✅ New |
| Validate timesheet | `/timesheets/:id/validate` | POST | ✅ New |
| Submit timesheet | `/timesheets/:id/submit` | POST | Existing |
| Recall timesheet | `/timesheets/:id/recall` | POST | ✅ New |
| Get current week | `/timesheets/my-current` | GET | ✅ New |
| My projects | `/my/projects` | GET | Existing |
| Search projects | `/search/projects?q=term` | GET | Existing |
| Search tasks | `/search/tasks?q=term&project_id=xxx` | GET | Existing |
| Get policy | `/timesheet-policies/:tenantId` | GET | Existing |

---

**End of Document**
