# User Stories: Weekly Timesheet Grid UI

**Project:** Kairos - Timesheet Management System
**Feature:** Weekly Timesheet Grid Interface
**Last Updated:** 2025-10-28

---

## Overview

This document provides comprehensive user stories for the weekly timesheet grid UI, mapping each story to existing or required backend endpoints. Stories are organized by user journey and prioritized by implementation criticality.

---

## User Personas

- **Employee**: Logs time, submits timesheets
- **Manager**: Reviews/approves team timesheets
- **Admin**: Configures policies, manages projects

---

## Epic 1: View Weekly Timesheet

### US-001: View Current Week's Timesheet

**As an** employee
**I want to** view my current week's timesheet in a grid format
**So that I** can see all my logged hours at a glance

**Acceptance Criteria:**
- Grid shows 7 columns (days of week) based on tenant's week_start policy
- Rows represent different projects/tasks
- Each cell shows hours logged for that project/day
- Daily totals displayed at bottom
- Weekly total displayed prominently
- Empty cells are clearly indicated

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/me
- Returns: Current user context + timesheetPolicy (week_start)

GET /api/v1/timesheet-policies/:tenantId
- Returns: week_start, max_hours_per_day, allow_overtime
```

❌ **Missing:**
```
GET /api/v1/time-entries/week/:userId/:weekStartDate
- Returns: Week view with entries grouped by day, includes project/task details
- Response format:
  {
    "week_start_date": "2025-01-20",
    "week_end_date": "2025-01-26",
    "entries": [
      {
        "id": "uuid",
        "project_id": "uuid",
        "project_name": "Project Alpha",
        "project_code": "ALPHA",
        "task_id": "uuid",
        "task_name": "Development",
        "day_of_week": 1,
        "date": "2025-01-20",
        "hours": 8,
        "note": "Backend API work"
      }
    ],
    "daily_totals": [0, 8, 7.5, 8, 8, 6.5, 0],
    "weekly_total": 38,
    "by_project": {
      "project-uuid-1": { "name": "Project Alpha", "hours": 20 },
      "project-uuid-2": { "name": "Project Beta", "hours": 18 }
    },
    "timesheet": {
      "id": "uuid",
      "status": "draft",
      "submitted_at": null
    }
  }
```

**Alternative (using existing endpoints - less efficient):**
```
GET /api/v1/time-entries?user_id=xxx&week_start_date=2025-01-20&limit=100
- Returns: Paginated time entries (requires client-side grouping/aggregation)
```

---

### US-002: Navigate Between Weeks

**As an** employee
**I want to** navigate to previous or next weeks
**So that I** can view or edit time from different periods

**Acceptance Criteria:**
- Previous/Next week navigation buttons
- Date range clearly displayed (e.g., "Jan 20 - Jan 26, 2025")
- Can jump to specific week using date picker
- Navigation preserves any unsaved warning
- Cannot navigate to future weeks beyond current week + configurable limit

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/time-entries/week/:userId/:weekStartDate
- Query different week_start_date values
```

❌ **Missing:**
```
GET /api/v1/timesheets/my-current
- Returns: Current week's timesheet for logged-in user (or creates draft if none exists)
- Simplifies "jump to current week" button
```

---

### US-003: View Timesheet Status

**As an** employee
**I want to** see the status of my timesheet (draft/submitted/approved/rejected)
**So that I** know what actions I can take

**Acceptance Criteria:**
- Status badge prominently displayed
- Draft: Green, editable
- Submitted: Yellow, read-only, can be recalled
- Approved: Blue, read-only, locked
- Rejected: Red, editable, shows rejection reason
- Submission/review timestamps displayed
- Reviewer name displayed for approved/rejected

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/timesheets?user_id=xxx&week_start=2025-01-20
- Returns: Timesheet with status, submitted_at, reviewed_at

GET /api/v1/timesheets/:id
- Returns: Full timesheet details with time_entries
```

---

## Epic 2: Log Time Entries

### US-004: Add Time Entry to Grid Cell

**As an** employee
**I want to** click on an empty cell and enter hours for a project/task
**So that I** can log my work time

**Acceptance Criteria:**
- Click empty cell opens entry dialog
- Search/select project from my assigned projects only
- Optionally select task for that project
- Enter hours (0-24, decimal allowed)
- Add optional note
- Entry saved and appears in grid immediately
- Daily total updates automatically

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/my/projects
- Returns: Projects user is assigned to (can log time to)

GET /api/v1/search/projects?q=term&limit=10
- Returns: Project search results

GET /api/v1/search/tasks?q=term&project_id=xxx&limit=10
- Returns: Task search results

POST /api/v1/time-entries
Body: {
  tenant_id: "uuid",
  user_id: "uuid",
  project_id: "uuid",
  task_id: "uuid" | null,
  week_start_date: "2025-01-20",
  day_of_week: 1,
  hours: 8,
  note: "Optional note"
}
- Creates single time entry
```

⚠️ **Enhancement Needed:**
- Add project membership validation to POST /time-entries
- Currently allows logging to any project; should validate user is member

---

### US-005: Edit Existing Time Entry

**As an** employee
**I want to** click on a filled cell and modify hours or note
**So that I** can correct mistakes or update my time log

**Acceptance Criteria:**
- Click cell opens edit dialog with current values
- Can change hours or note
- Cannot change project/task/date (must delete and recreate)
- Save updates grid immediately
- Shows validation errors inline
- Can only edit if timesheet is draft or rejected

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/time-entries/:id
- Returns: Single time entry details

PATCH /api/v1/time-entries/:id
Body: {
  hours: 7.5,
  note: "Updated note"
}
- Updates hours and/or note only
```

⚠️ **Enhancement Needed:**
- Add validation that timesheet is editable (not submitted/approved)
- Currently allows editing regardless of timesheet status

---

### US-006: Delete Time Entry

**As an** employee
**I want to** delete a time entry from the grid
**So that I** can remove incorrect or accidental entries

**Acceptance Criteria:**
- Delete button/icon in cell or edit dialog
- Confirmation prompt before deletion
- Entry removed from grid immediately
- Daily/weekly totals recalculated
- Can only delete if timesheet is draft or rejected

**Endpoints Required:**

✅ **Existing:**
```
DELETE /api/v1/time-entries/:id
- Deletes time entry
```

⚠️ **Enhancement Needed:**
- Add validation that timesheet is editable (not submitted/approved)

---

### US-007: Add Note to Time Entry

**As an** employee
**I want to** add detailed notes to individual time entries
**So that I** can document what work was done

**Acceptance Criteria:**
- Note field in entry dialog (max 1000 chars)
- Note icon appears in cell if note exists
- Hover shows note preview
- Click opens full note in dialog
- Notes preserved across edits

**Endpoints Required:**

✅ **Existing:**
```
POST /api/v1/time-entries
PATCH /api/v1/time-entries/:id
- Both support 'note' field
```

---

### US-008: Bulk Fill Week for Single Project

**As an** employee
**I want to** enter the same hours across multiple days for one project
**So that I** can quickly fill regular weekly hours

**Acceptance Criteria:**
- "Fill Week" button in row or toolbar
- Select project/task
- Enter hours
- Select which days to apply (checkboxes for Mon-Sun)
- Creates multiple entries in single action
- Warns if entries already exist for selected days

**Endpoints Required:**

❌ **Missing (Critical):**
```
POST /api/v1/time-entries/bulk
Body: {
  user_id: "uuid",
  week_start_date: "2025-01-20",
  entries: [
    {
      project_id: "uuid",
      task_id: "uuid" | null,
      day_of_week: 1,
      hours: 8,
      note: "Daily work"
    },
    {
      project_id: "uuid",
      task_id: "uuid" | null,
      day_of_week: 2,
      hours: 8,
      note: "Daily work"
    }
    // ... more entries
  ]
}
- Creates/updates multiple time entries atomically
- Returns: { created: [...], updated: [...], errors: [...] }
- Validates all entries before committing (transaction)
```

**Alternative (inefficient):**
- Multiple POST /api/v1/time-entries calls (slow, not atomic)

---

### US-009: Copy Previous Week

**As an** employee
**I want to** copy all time entries from a previous week
**So that I** can quickly replicate regular weekly schedules

**Acceptance Criteria:**
- "Copy Previous Week" button in toolbar
- Confirms which week to copy from
- Copies all entries with same project/task/hours distribution
- Adjusts dates to current week
- Warns about entries that would be overwritten
- Does not copy notes (or makes them optional)

**Endpoints Required:**

❌ **Missing (High Priority):**
```
POST /api/v1/time-entries/copy-week
Body: {
  user_id: "uuid",
  from_week_start: "2025-01-13",
  to_week_start: "2025-01-20",
  overwrite_existing: false,
  copy_notes: false
}
- Copies all entries from source week to target week
- Returns: { copied_count: 25, skipped_count: 3, entries: [...] }
```

**Alternative:**
- Fetch previous week via GET /time-entries, then bulk create via POST /time-entries/bulk

---

### US-010: Validate Hours Constraints

**As an** employee
**I want to** see warnings when I exceed daily/weekly hour limits
**So that I** can correct my timesheet before submission

**Acceptance Criteria:**
- Visual warning when daily hours exceed max_hours_per_day (if policy enforces)
- Warning when weekly hours exceed configured limit
- Warnings are non-blocking if allow_overtime is true
- Errors are blocking if allow_overtime is false
- Validation runs on every change
- Summary of violations shown before submit

**Endpoints Required:**

✅ **Existing (partial):**
```
GET /api/v1/timesheet-policies/:tenantId
- Returns: max_hours_per_day, allow_overtime
```

❌ **Missing:**
```
POST /api/v1/timesheets/:id/validate
- Validates entire timesheet against policy rules
- Returns:
  {
    "valid": true/false,
    "errors": [
      {
        "type": "max_hours_exceeded",
        "message": "Monday exceeds max 8 hours (logged: 10)",
        "day_of_week": 1,
        "hours": 10,
        "max": 8
      }
    ],
    "warnings": [
      {
        "type": "no_entries",
        "message": "No entries for Wednesday",
        "day_of_week": 3
      }
    ],
    "summary": {
      "total_hours": 42,
      "days_with_entries": 5,
      "entry_count": 35
    }
  }
```

**Alternative (client-side):**
- Fetch policy and entries, validate in browser (less reliable)

---

## Epic 3: Submit & Approve Timesheet

### US-011: Submit Timesheet for Approval

**As an** employee
**I want to** submit my completed timesheet for manager approval
**So that my** hours are officially recorded

**Acceptance Criteria:**
- Submit button enabled only when timesheet is valid
- Confirmation dialog shows weekly summary before submit
- Status changes to "Submitted"
- Timesheet becomes read-only after submission
- Notification sent to manager (out of scope for backend)
- Cannot be edited after submission (unless recalled)

**Endpoints Required:**

✅ **Existing:**
```
POST /api/v1/timesheets/:id/submit
- Changes status from draft → submitted
- Records submitted_at, submitted_by_user_id
- Returns: Updated timesheet
```

❌ **Recommended (pre-flight check):**
```
POST /api/v1/timesheets/:id/validate
- Run validation before allowing submit
```

---

### US-012: Recall Submitted Timesheet

**As an** employee
**I want to** recall a submitted timesheet
**So that I** can make corrections before it's reviewed

**Acceptance Criteria:**
- Recall button available when status is "Submitted"
- Not available once approved
- Confirmation prompt
- Status returns to "Draft"
- Becomes editable again

**Endpoints Required:**

❌ **Missing:**
```
POST /api/v1/timesheets/:id/recall
- Changes status from submitted → draft
- Only allowed if not yet reviewed
- Returns: Updated timesheet
```

**Workaround:**
- Could use existing architecture and add this endpoint easily

---

### US-013: View Rejection Reason

**As an** employee
**I want to** see why my timesheet was rejected
**So that I** can make the necessary corrections

**Acceptance Criteria:**
- Rejection reason prominently displayed
- Reviewer name and date shown
- Timesheet becomes editable again
- Can resubmit after corrections

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/timesheets/:id
- Returns: review_note (contains rejection reason)
- Returns: reviewed_by_user_id, reviewed_at
```

---

### US-014: Approve Team Member Timesheet (Manager)

**As a** manager
**I want to** review and approve my team members' timesheets
**So that** their hours are finalized and can be used for payroll

**Acceptance Criteria:**
- List of pending timesheets for direct reports
- Click to view full timesheet grid (read-only)
- Approve button with optional comment
- Status changes to "Approved"
- Timesheet locks (cannot be edited)
- Notification sent to employee (out of scope)

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/timesheets?team=true&status=submitted
- Returns: List of team members' submitted timesheets
- Filters by profiles.manager_user_id

GET /api/v1/timesheets/:id
- View full timesheet with entries

POST /api/v1/timesheets/:id/approve
Body: {
  reviewNote: "Looks good!"  // Optional
}
- Changes status to approved
- Records reviewed_at, reviewed_by_user_id
```

---

### US-015: Reject Team Member Timesheet (Manager)

**As a** manager
**I want to** reject a timesheet with a reason
**So that** the employee can correct issues

**Acceptance Criteria:**
- Reject button requires comment (mandatory)
- Status changes to "Rejected"
- Employee can edit and resubmit
- Rejection reason visible to employee

**Endpoints Required:**

✅ **Existing:**
```
POST /api/v1/timesheets/:id/reject
Body: {
  reviewNote: "Please add notes to Friday entries"  // Required
}
- Changes status to rejected
- Records reviewed_at, reviewed_by_user_id, review_note
```

---

## Epic 4: Project & Task Selection

### US-016: View Assigned Projects

**As an** employee
**I want to** see only projects I'm assigned to
**So that I** don't accidentally log time to wrong projects

**Acceptance Criteria:**
- Dropdown shows only assigned projects
- Projects sorted by name or recent usage
- Shows project code and name
- Empty state if no projects assigned

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/my/projects
- Returns: Projects current user is member of
- Should be used as source for project picker
```

⚠️ **Enhancement Needed:**
- Enforce project membership in POST /api/v1/time-entries
- Currently not validated; should return 403 if user not member

---

### US-017: Search Projects

**As an** employee
**I want to** search for projects by name or code
**So that I** can quickly find the project I need

**Acceptance Criteria:**
- Search input with debounce
- Searches name and code
- Shows results as-you-type
- Limited to assigned projects only

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/search/projects?q=searchterm&limit=10
- Returns: Matching projects

GET /api/v1/my/projects
- Should filter search results to only assigned projects (client-side or server-side)
```

---

### US-018: Select Task for Project

**As an** employee
**I want to** optionally select a specific task within a project
**So that I** can categorize my time more granularly

**Acceptance Criteria:**
- Task dropdown appears after project selected
- Shows tasks for selected project only
- Task is optional (can log to project only)
- Tasks searchable

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/search/tasks?project_id=xxx&q=term&limit=10
- Returns: Tasks filtered by project
```

---

## Epic 5: Timesheet Grid UX Enhancements

### US-019: Keyboard Navigation in Grid

**As an** employee
**I want to** navigate the timesheet grid using keyboard
**So that I** can quickly enter time without using mouse

**Acceptance Criteria:**
- Tab/Shift+Tab moves between cells
- Arrow keys navigate grid
- Enter opens cell editor
- Esc closes editor without saving
- Ctrl+S saves current entry

**Endpoints Required:**
- ✅ All existing time-entry endpoints support keyboard workflow

---

### US-020: Inline Cell Editing

**As an** employee
**I want to** edit hours directly in the grid cell
**So that I** have a faster editing experience

**Acceptance Criteria:**
- Click cell to edit inline (no dialog)
- Type hours directly
- Auto-save on blur
- Show loading state during save
- Optimistic UI update

**Endpoints Required:**

✅ **Existing:**
```
PATCH /api/v1/time-entries/:id
Body: { hours: 7.5 }
```

---

### US-021: Visual Indicators for Cell States

**As an** employee
**I want to** see visual cues for different cell states
**So that I** can quickly understand my timesheet status

**Acceptance Criteria:**
- Empty cells: Light gray
- Filled cells: White/colored background
- Selected cell: Blue border
- Editing cell: Different background
- Error cells: Red border
- Cells with notes: Icon indicator
- Read-only cells (submitted): Disabled appearance

**Endpoints Required:**
- ✅ Client-side rendering based on data from existing endpoints

---

### US-022: Daily Hours Totals

**As an** employee
**I want to** see total hours per day at the bottom of each column
**So that I** can track daily hour targets

**Acceptance Criteria:**
- Sum displayed below each day column
- Updates in real-time as entries change
- Highlights if exceeds max_hours_per_day
- Shows warning color if policy violated

**Endpoints Required:**

✅ **Existing (calculated):**
```
GET /api/v1/time-entries/week/:userId/:weekStartDate
- Returns daily_totals: [0, 8, 7.5, 8, 8, 6.5, 0]
```

**Alternative:**
- Client-side calculation from fetched entries

---

### US-023: Weekly Hours Total

**As an** employee
**I want to** see my total hours for the week prominently displayed
**So that I** can track progress toward expected hours

**Acceptance Criteria:**
- Large display of total hours (e.g., "38 / 40 hours")
- Progress bar showing percentage
- Updates in real-time
- Shows target based on policy or contract

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/time-entries/stats/weekly/:userId/:weekStartDate
- Returns: Total hours for week

GET /api/v1/time-entries/week/:userId/:weekStartDate
- Returns: weekly_total: 38
```

---

### US-024: Project Hours Breakdown

**As an** employee
**I want to** see hours distribution across projects
**So that I** can verify time allocation

**Acceptance Criteria:**
- Summary panel showing hours per project
- Sorted by hours descending
- Shows percentage of total
- Visual bar chart or pie chart

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/time-entries/week/:userId/:weekStartDate
- Returns: by_project object with hours per project
```

**Alternative:**
```
GET /api/v1/time-entries/stats/project/:projectId
- Individual project totals (requires multiple calls)
```

---

### US-025: Timesheet Status History

**As an** employee
**I want to** see the history of my timesheet submissions
**So that I** can track approval patterns

**Acceptance Criteria:**
- Timeline view of status changes
- Shows: Draft created, Submitted, Approved/Rejected
- Timestamps for each transition
- Reviewer names for approvals/rejections

**Endpoints Required:**

⚠️ **Partial - Enhancement Needed:**
```
GET /api/v1/timesheets/:id
- Currently returns: created_at, submitted_at, reviewed_at
- Missing: Change history/audit trail

Future enhancement:
GET /api/v1/timesheets/:id/history
- Returns: Array of status change events with timestamps and actors
```

---

### US-026: Empty State Guidance

**As an** employee
**I want to** see helpful guidance when my timesheet is empty
**So that I** know what to do next

**Acceptance Criteria:**
- Prominent message: "No time entries yet"
- Suggested actions: "Add your first entry" or "Copy from last week"
- Link to assigned projects
- Visual illustration (icon/graphic)

**Endpoints Required:**
- ✅ Client-side rendering based on empty data

---

### US-027: Unsaved Changes Warning

**As an** employee
**I want to** be warned before navigating away with unsaved changes
**So that I** don't lose my work

**Acceptance Criteria:**
- Browser prompt if editing and navigating away
- In-app warning if changing weeks with unsaved edits
- Option to save, discard, or cancel navigation
- Clear indication of what's unsaved

**Endpoints Required:**
- ✅ Client-side state management

---

## Epic 6: Reporting & Insights

### US-028: Monthly Timesheet Summary

**As an** employee
**I want to** view a summary of my timesheets for the month
**So that I** can see overall patterns and totals

**Acceptance Criteria:**
- List of all weeks in month
- Status of each week's timesheet
- Total hours per week
- Monthly total
- Visual calendar view

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/timesheets?user_id=xxx&from=2025-01-01&to=2025-01-31
- Returns: Timesheets in date range with totals
```

---

### US-029: Project Time Allocation Report

**As a** manager
**I want to** see time allocation across projects for my team
**So that I** can optimize resource planning

**Acceptance Criteria:**
- Grouped by project, then by team member
- Date range filter
- Export to CSV
- Visual breakdown (chart)

**Endpoints Required:**

⚠️ **Partial - Multiple queries needed:**
```
GET /api/v1/timesheets?team=true&from=xxx&to=xxx
- Get team timesheets

GET /api/v1/time-entries?project_id=xxx&from=xxx&to=xxx
- Get entries per project (requires aggregation)

Future enhancement:
GET /api/v1/reports/project-allocation?team=true&from=xxx&to=xxx
- Aggregated report optimized for this view
```

---

### US-030: Calendar View of My Time

**As an** employee
**I want to** see my time entries, leave, and holidays in a calendar view
**So that I** can visualize my entire schedule

**Acceptance Criteria:**
- Month/week calendar layout
- Color-coded: Work time, PTO, Holidays
- Click day to see details
- Visual density indicators (hours per day)

**Endpoints Required:**

✅ **Existing:**
```
GET /api/v1/calendar?user_id=xxx&from=2025-01-01&to=2025-01-31&include=holidays,leave,timesheets
- Returns: Unified calendar view
- Combines holidays, leave_requests, and timesheets
```

---

## Missing Endpoints Summary

### 🔴 Critical (Required for Basic Weekly UI)

1. **GET /api/v1/time-entries/week/:userId/:weekStartDate**
   - Returns week view with aggregations, project/task details, and daily/weekly totals
   - Alternative: Use existing GET /time-entries with client-side aggregation (less efficient)

2. **POST /api/v1/time-entries/bulk**
   - Create/update multiple time entries atomically
   - Essential for "Fill Week" and bulk edit features
   - Alternative: Multiple individual POST calls (slow, not atomic)

3. **Project Membership Validation**
   - Enforce in POST /api/v1/time-entries
   - Currently missing, allows logging to any project

4. **Timesheet Status Locking**
   - Prevent editing time entries when timesheet is submitted/approved
   - Policy exists (lock_after_approval) but not enforced

---

### 🟡 High Priority (Significantly Improves UX)

5. **POST /api/v1/time-entries/copy-week**
   - Copy previous week's entries
   - Major time-saver for regular schedules

6. **POST /api/v1/timesheets/:id/validate**
   - Validate entire week against policies
   - Provides proactive error feedback

7. **GET /api/v1/timesheets/my-current**
   - Get or create current week's timesheet
   - Simplifies "view current week" flow

8. **POST /api/v1/timesheets/:id/recall**
   - Recall submitted timesheet back to draft
   - Allows corrections before approval

---

### 🟢 Nice to Have (Polish & Advanced Features)

9. **GET /api/v1/timesheets/:id/history**
   - Audit trail of status changes
   - Useful for compliance and tracking

10. **GET /api/v1/reports/project-allocation**
    - Aggregated project time reports for managers
    - Optimized query vs multiple client-side calls

11. **PUT /api/v1/time-entries/upsert**
    - Create if not exists, update if exists
    - Simplifies grid editing logic

---

## Implementation Recommendations

### Phase 1: Foundation (Week 1)
- Implement GET /time-entries/week/:userId/:weekStartDate
- Add project membership validation
- Add timesheet status locking to time-entry mutations
- These enable basic read-only weekly grid view

### Phase 2: Core Editing (Week 2)
- Implement POST /time-entries/bulk
- Implement POST /timesheets/:id/validate
- Implement POST /timesheets/:id/recall
- These enable full timesheet editing workflow

### Phase 3: UX Enhancements (Week 3)
- Implement POST /time-entries/copy-week
- Implement GET /timesheets/my-current
- Add enhanced metadata to GET /timesheets/:id
- These add power-user features

### Phase 4: Reporting (Week 4)
- Implement GET /timesheets/:id/history
- Implement GET /reports/project-allocation
- Add export capabilities
- These support management and compliance

---

## API Specification Examples

### GET /api/v1/time-entries/week/:userId/:weekStartDate

**Request:**
```
GET /api/v1/time-entries/week/550e8400-e29b-41d4-a716-446655440000/2025-01-20
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
      "hours": 8,
      "note": "API implementation",
      "created_at": "2025-01-20T09:00:00Z",
      "updated_at": "2025-01-20T09:00:00Z"
    },
    {
      "id": "entry-uuid-2",
      "project_id": "project-uuid-1",
      "project_name": "Project Alpha",
      "project_code": "ALPHA",
      "task_id": "task-uuid-2",
      "task_name": "Code Review",
      "day_of_week": 2,
      "date": "2025-01-21",
      "hours": 4,
      "note": null,
      "created_at": "2025-01-21T14:00:00Z",
      "updated_at": "2025-01-21T14:00:00Z"
    }
  ],
  "daily_totals": [0, 8, 7.5, 8, 8, 6.5, 0],
  "weekly_total": 38,
  "by_project": {
    "project-uuid-1": {
      "project_name": "Project Alpha",
      "project_code": "ALPHA",
      "hours": 20.5
    },
    "project-uuid-2": {
      "project_name": "Project Beta",
      "project_code": "BETA",
      "hours": 17.5
    }
  },
  "timesheet": {
    "id": "timesheet-uuid-1",
    "status": "draft",
    "submitted_at": null,
    "reviewed_at": null,
    "created_at": "2025-01-20T08:00:00Z",
    "updated_at": "2025-01-21T14:00:00Z"
  }
}
```

---

### POST /api/v1/time-entries/bulk

**Request:**
```
POST /api/v1/time-entries/bulk
Authorization: Bearer <session_token>
Content-Type: application/json

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
    },
    {
      "project_id": "project-uuid-1",
      "task_id": "task-uuid-1",
      "day_of_week": 3,
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
      "task_id": "task-uuid-1",
      "day_of_week": 1,
      "hours": 8,
      "note": "Backend development"
    },
    {
      "id": "entry-uuid-2",
      "project_id": "project-uuid-1",
      "task_id": "task-uuid-1",
      "day_of_week": 2,
      "hours": 8,
      "note": "Backend development"
    }
  ],
  "updated": [],
  "errors": [
    {
      "day_of_week": 3,
      "error": "Entry already exists for this project/task/day",
      "existing_entry_id": "entry-uuid-existing"
    }
  ],
  "summary": {
    "created_count": 2,
    "updated_count": 0,
    "error_count": 1,
    "total_requested": 3
  }
}
```

---

### POST /api/v1/timesheets/:id/validate

**Request:**
```
POST /api/v1/timesheets/timesheet-uuid-1/validate
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
    },
    {
      "type": "low_hours",
      "severity": "warning",
      "message": "Total hours (35) below expected (40)",
      "weekly_total": 35,
      "expected": 40
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

---

### POST /api/v1/time-entries/copy-week

**Request:**
```
POST /api/v1/time-entries/copy-week
Authorization: Bearer <session_token>
Content-Type: application/json

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
      "task_id": "task-uuid-1",
      "day_of_week": 1,
      "hours": 8,
      "note": null,
      "source_entry_id": "original-entry-uuid-1"
    }
    // ... more copied entries
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

---

### GET /api/v1/timesheets/my-current

**Request:**
```
GET /api/v1/timesheets/my-current
Authorization: Bearer <session_token>
```

**Response: 200 OK**
```json
{
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
```

Note: If no timesheet exists for current week, creates draft automatically.

---

### POST /api/v1/timesheets/:id/recall

**Request:**
```
POST /api/v1/timesheets/timesheet-uuid-1/recall
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

**Response: 400 Bad Request** (if already reviewed)
```json
{
  "error": "Bad Request",
  "message": "Cannot recall timesheet that has been reviewed",
  "statusCode": 400
}
```

---

## Frontend Integration Notes

### Initial Page Load Sequence

1. **GET /api/v1/me**
   - Get user context, tenant, and timesheetPolicy
   - Extract week_start to configure grid (0=Sunday, 1=Monday, etc.)

2. **GET /api/v1/time-entries/week/:userId/:weekStartDate**
   - Fetch current week's data with all aggregations
   - Single request gets everything needed for initial render

3. **GET /api/v1/my/projects**
   - Fetch assigned projects for dropdown
   - Cache for duration of session

### Optimistic UI Updates

For best UX, implement optimistic updates:
- Update grid immediately on edit
- Show loading state in cell
- Revert on error
- Use PATCH /time-entries/:id for single edits
- Use POST /time-entries/bulk for multi-cell operations

### Caching Strategy

- Cache timesheet policies (rarely change)
- Cache project list (refresh hourly or on visibility)
- Do NOT cache time entries (always fetch latest)
- Use ETag/If-None-Match for conditional requests

### Error Handling

- Network errors: Show retry button
- Validation errors: Highlight cell, show inline error
- Permission errors: Disable edit, show read-only message
- Conflict errors (concurrent edits): Show merge dialog

---

## Testing Checklist

### Critical Path Tests

- [ ] View empty weekly grid
- [ ] Add single time entry
- [ ] Edit existing entry
- [ ] Delete entry
- [ ] Fill entire week (bulk operation)
- [ ] Copy from previous week
- [ ] Navigate between weeks
- [ ] Submit timesheet
- [ ] Recall submitted timesheet
- [ ] Approve timesheet (as manager)
- [ ] Reject timesheet (as manager)
- [ ] View rejected reason and edit
- [ ] Validation errors display correctly

### Edge Cases

- [ ] Exceed max daily hours (with/without allow_overtime)
- [ ] Duplicate entry prevention
- [ ] Project membership validation
- [ ] Edit locked timesheet (should fail)
- [ ] Concurrent edits by same user
- [ ] Network interruption during bulk save
- [ ] Very long notes (1000+ chars)
- [ ] Decimal hour values (0.25, 0.5, 7.75)
- [ ] Zero hours entry
- [ ] Negative hours (should fail validation)

---

## Appendix: Existing Endpoints Reference

### Quick Reference Table

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| /time-entries | GET | List time entries with pagination | ✅ Exists |
| /time-entries/:id | GET | Get single entry | ✅ Exists |
| /time-entries | POST | Create time entry | ✅ Exists |
| /time-entries/:id | PATCH | Update entry (hours/note) | ✅ Exists |
| /time-entries/:id | DELETE | Delete entry | ✅ Exists |
| /time-entries/stats/weekly/:userId/:weekStartDate | GET | Weekly total hours | ✅ Exists |
| /time-entries/stats/project/:projectId | GET | Project total hours | ✅ Exists |
| /time-entries/week/:userId/:weekStartDate | GET | Week view with aggregations | ❌ **Missing** |
| /time-entries/bulk | POST | Bulk create/update | ❌ **Missing** |
| /time-entries/copy-week | POST | Copy week | ❌ **Missing** |
| /timesheets | GET | List timesheets | ✅ Exists |
| /timesheets/:id | GET | Get timesheet with entries | ✅ Exists |
| /timesheets | POST | Create timesheet | ✅ Exists |
| /timesheets/:id/submit | POST | Submit for approval | ✅ Exists |
| /timesheets/:id/approve | POST | Approve timesheet | ✅ Exists |
| /timesheets/:id/reject | POST | Reject timesheet | ✅ Exists |
| /timesheets/:id | DELETE | Delete draft | ✅ Exists |
| /timesheets/:id/validate | POST | Validate week | ❌ **Missing** |
| /timesheets/:id/recall | POST | Recall submitted | ❌ **Missing** |
| /timesheets/my-current | GET | Get/create current week | ❌ **Missing** |
| /my/projects | GET | User's assigned projects | ✅ Exists |
| /projects/:id/members | GET | Project members | ✅ Exists |
| /search/projects | GET | Search projects | ✅ Exists |
| /search/tasks | GET | Search tasks | ✅ Exists |
| /timesheet-policies/:tenantId | GET | Get tenant policy | ✅ Exists |
| /calendar | GET | Unified calendar view | ✅ Exists |

---

## Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-28 | Initial comprehensive user stories document |

---

**End of Document**
