# Project Management - New Features Guide

**Version:** 2.0
**Date:** November 2025
**Status:** Production Ready ✅

This document describes the new features added to the project management system: **Extended Project Metadata** and **Bulk Member Assignment**.

---

## Table of Contents

1. [Extended Project Metadata](#extended-project-metadata)
2. [Bulk Member Assignment](#bulk-member-assignment)
3. [Updated Response Types](#updated-response-types)
4. [Migration Guide](#migration-guide)
5. [Code Examples](#code-examples)

---

## Extended Project Metadata

Projects now support additional metadata fields for better project tracking and management.

### New Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | No | Project description (max 2000 chars) |
| `startDate` | string | No | Project start date (YYYY-MM-DD) |
| `endDate` | string | No | Project end date (YYYY-MM-DD) |
| `clientName` | string | No | Client/customer name (max 255 chars) |
| `budgetHours` | number | No | Allocated budget in hours |
| `createdAt` | string | Yes | Auto-generated creation timestamp |
| `updatedAt` | string | Yes | Auto-updated modification timestamp |

### Updated Endpoints

All project endpoints now return the extended fields:

#### 1. Create Project (Enhanced)

**POST** `/api/v1/projects`

**Request Body:**
```typescript
{
  // Existing fields
  name: string;          // Required
  code?: string | null;
  active?: boolean;      // Default: true

  // NEW: Extended metadata fields
  description?: string | null;      // Max 2000 characters
  startDate?: string | null;        // Format: YYYY-MM-DD
  endDate?: string | null;          // Format: YYYY-MM-DD
  clientName?: string | null;       // Max 255 characters
  budgetHours?: number | null;      // Positive number
}
```

**Response:** (201 Created)
```typescript
{
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  active: boolean;
  description: string | null;
  startDate: string | null;         // ISO date
  endDate: string | null;           // ISO date
  clientName: string | null;
  budgetHours: string | null;       // Decimal string
  createdAt: string;                // ISO datetime
  updatedAt: string;                // ISO datetime
}
```

**Example:**
```typescript
const response = await fetch('/api/v1/projects', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Website Redesign',
    code: 'WEB-001',
    description: 'Complete redesign of the company website with modern UI/UX',
    startDate: '2025-11-01',
    endDate: '2026-02-28',
    clientName: 'Acme Corporation',
    budgetHours: 500
  })
});

const project = await response.json();
console.log(project.budgetHours); // "500.00"
console.log(project.createdAt);   // "2025-11-04T10:30:00.000Z"
```

---

#### 2. Update Project (Enhanced)

**PATCH** `/api/v1/projects/:id`

All fields are optional. Only provided fields will be updated. The `updatedAt` timestamp is automatically updated.

**Request Body:** (all fields optional)
```typescript
{
  name?: string;
  code?: string | null;
  active?: boolean;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  clientName?: string | null;
  budgetHours?: number | null;
}
```

**Example:**
```typescript
// Update project dates and budget
await fetch(`/api/v1/projects/${projectId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    startDate: '2025-12-01',
    endDate: '2026-06-30',
    budgetHours: 600,
    description: 'Updated project scope with additional features'
  })
});

// Clear metadata fields (set to null)
await fetch(`/api/v1/projects/${projectId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    clientName: null,
    description: null
  })
});
```

---

#### 3. List Projects (Enhanced Response)

**GET** `/api/v1/projects`

The response now includes all metadata fields for each project.

**Response:**
```typescript
{
  data: Array<{
    id: string;
    tenantId: string;
    name: string;
    code: string | null;
    active: boolean;
    description: string | null;      // NEW
    startDate: string | null;        // NEW
    endDate: string | null;          // NEW
    clientName: string | null;       // NEW
    budgetHours: string | null;      // NEW
    createdAt: string;               // NEW
    updatedAt: string;               // NEW
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

#### 4. Get Single Project (Enhanced Response)

**GET** `/api/v1/projects/:id`

Returns the complete project object with all metadata.

**Example:**
```typescript
const response = await fetch(`/api/v1/projects/${projectId}`, {
  headers: { 'Authorization': `Bearer ${sessionToken}` }
});

const project = await response.json();

// Display in UI
console.log(`Project: ${project.name}`);
console.log(`Client: ${project.clientName || 'Internal'}`);
console.log(`Budget: ${project.budgetHours ? project.budgetHours + ' hours' : 'N/A'}`);
console.log(`Timeline: ${project.startDate} to ${project.endDate}`);
console.log(`Last updated: ${new Date(project.updatedAt).toLocaleString()}`);
```

---

### Field Validation Rules

1. **description**: Max 2000 characters, optional
2. **startDate & endDate**: Must be in YYYY-MM-DD format
   - No validation that endDate > startDate (business logic decision)
3. **clientName**: Max 255 characters, optional
4. **budgetHours**: Must be a positive number if provided
5. **createdAt/updatedAt**: Read-only, managed by database

### Error Responses

```typescript
// Invalid date format
{
  "error": "Bad Request",
  "message": "Validation failed: startDate invalid format (use YYYY-MM-DD)",
  "statusCode": 400
}

// Budget hours not positive
{
  "error": "Bad Request",
  "message": "Validation failed: Budget hours must be positive",
  "statusCode": 400
}

// Description too long
{
  "error": "Bad Request",
  "message": "Validation failed: Description too long",
  "statusCode": 400
}
```

---

## Bulk Member Assignment

Add multiple users to a project in a single API call with detailed success/failure reporting.

### Endpoint

**POST** `/api/v1/projects/:id/members/bulk`

Assign multiple users to a project at once. Returns detailed results for each user operation.

**Path Parameters:**
- `id` (string, required) - Project UUID

**Request Body:**
```typescript
{
  userIds: string[];     // Required, array of user UUIDs (min 1)
  role?: string;         // Optional, default: 'member'
                        // Valid values: 'member', 'lead', 'observer'
}
```

**Response:** (201 Created)
```typescript
{
  data: {
    success: Array<{
      userId: string;
      membershipId: string;    // UUID of created membership
    }>;
    failed: Array<{
      userId: string;
      reason: string;          // Error message
    }>;
  };
  summary: {
    total: number;             // Total users attempted
    succeeded: number;         // Successfully added
    failed: number;            // Failed to add
  };
}
```

**Access:** Admin, Manager only

**Errors:**
- `400 Bad Request` - Invalid request (empty userIds array, invalid UUIDs)
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Project doesn't exist

---

### Usage Examples

#### Example 1: Assign Team to New Project

```typescript
const assignTeam = async (projectId: string, userIds: string[]) => {
  const response = await fetch(
    `/api/v1/projects/${projectId}/members/bulk`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userIds: userIds,
        role: 'member'
      })
    }
  );

  const result = await response.json();

  console.log(`Added ${result.summary.succeeded} members`);
  console.log(`Failed: ${result.summary.failed}`);

  // Handle failures
  if (result.data.failed.length > 0) {
    result.data.failed.forEach(failure => {
      console.error(`User ${failure.userId}: ${failure.reason}`);
    });
  }

  return result;
};

// Usage
await assignTeam('project-uuid', [
  'user-1-uuid',
  'user-2-uuid',
  'user-3-uuid'
]);
```

---

#### Example 2: Assign with Role

```typescript
// Assign project leads
await fetch(`/api/v1/projects/${projectId}/members/bulk`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userIds: [leadUserId1, leadUserId2],
    role: 'lead'
  })
});
```

---

#### Example 3: Handle Partial Success

```typescript
const response = await fetch(
  `/api/v1/projects/${projectId}/members/bulk`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userIds: ['user-1', 'user-2', 'user-3', 'invalid-uuid'],
      role: 'member'
    })
  }
);

const result = await response.json();

/*
Response might be:
{
  data: {
    success: [
      { userId: 'user-1', membershipId: 'membership-1' },
      { userId: 'user-2', membershipId: 'membership-2' }
    ],
    failed: [
      { userId: 'user-3', reason: 'User is already a member of this project' },
      { userId: 'invalid-uuid', reason: 'User not found in this tenant' }
    ]
  },
  summary: {
    total: 4,
    succeeded: 2,
    failed: 2
  }
}
*/

// Display results to user
if (result.summary.succeeded === result.summary.total) {
  showSuccess('All users added successfully');
} else if (result.summary.succeeded > 0) {
  showWarning(
    `${result.summary.succeeded} users added, ${result.summary.failed} failed`
  );
} else {
  showError('Failed to add any users');
}

// Show detailed errors
result.data.failed.forEach(failure => {
  console.log(`❌ ${failure.userId}: ${failure.reason}`);
});
```

---

#### Example 4: UI Component with Progress

```typescript
const BulkAssignComponent = ({ projectId, availableUsers }) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleBulkAssign = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/projects/${projectId}/members/bulk`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userIds: selectedUsers,
            role: 'member'
          })
        }
      );

      const data = await response.json();
      setResult(data);

      // Show notification
      if (data.summary.succeeded === data.summary.total) {
        toast.success(`All ${data.summary.total} users added to project`);
      } else {
        toast.warning(
          `${data.summary.succeeded}/${data.summary.total} users added`
        );
      }
    } catch (error) {
      toast.error('Failed to assign users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <UserMultiSelect
        users={availableUsers}
        selected={selectedUsers}
        onChange={setSelectedUsers}
      />

      <button
        onClick={handleBulkAssign}
        disabled={loading || selectedUsers.length === 0}
      >
        {loading ? 'Adding...' : `Add ${selectedUsers.length} Users`}
      </button>

      {result && (
        <ResultSummary
          success={result.summary.succeeded}
          failed={result.summary.failed}
          errors={result.data.failed}
        />
      )}
    </div>
  );
};
```

---

### Common Failure Reasons

| Reason | Description | Resolution |
|--------|-------------|------------|
| "User not found in this tenant" | User doesn't exist or belongs to different tenant | Verify user ID is correct and user has membership |
| "User is already a member of this project" | Duplicate assignment attempted | Skip this user, already assigned |
| "Project not found" | Invalid project ID or tenant mismatch | Verify project exists and belongs to tenant |
| "Unknown error" | Unexpected database or system error | Check server logs, retry operation |

---

### Best Practices

1. **Validate User IDs First**: Check user IDs exist before calling bulk endpoint
2. **Handle Partial Success**: Don't treat partial success as complete failure
3. **Show Detailed Errors**: Display which users failed and why
4. **Retry Logic**: Implement retry for failed users after fixing issues
5. **Limit Batch Size**: Recommend max 50-100 users per request for performance
6. **Transaction Safety**: All-or-nothing not guaranteed - handle partial success
7. **Duplicate Detection**: Backend handles duplicates gracefully, no need to pre-check

---

## Updated Response Types

### Complete Project Type

```typescript
interface Project {
  // Core fields
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  active: boolean;

  // Extended metadata (NEW)
  description: string | null;
  startDate: string | null;        // YYYY-MM-DD
  endDate: string | null;          // YYYY-MM-DD
  clientName: string | null;
  budgetHours: string | null;      // Decimal string (e.g., "500.00")

  // Timestamps (NEW)
  createdAt: string;               // ISO datetime
  updatedAt: string;               // ISO datetime
}

// Helper function to parse budget hours
const parseBudgetHours = (budgetHours: string | null): number | null => {
  return budgetHours ? parseFloat(budgetHours) : null;
};
```

### Project with Member Count

```typescript
interface ProjectWithStats extends Project {
  memberCount?: number;
  totalHoursLogged?: number;
  budgetRemaining?: number;  // budgetHours - totalHoursLogged
}

// Calculate budget utilization
const calculateBudgetUtilization = (project: ProjectWithStats) => {
  const budget = parseBudgetHours(project.budgetHours);
  if (!budget || !project.totalHoursLogged) return null;

  return {
    used: project.totalHoursLogged,
    total: budget,
    remaining: budget - project.totalHoursLogged,
    percentage: (project.totalHoursLogged / budget) * 100
  };
};
```

---

## Migration Guide

### For Existing Frontend Code

#### 1. Update Type Definitions

```typescript
// Before
interface Project {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  active: boolean;
}

// After
interface Project {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  active: boolean;
  description: string | null;      // NEW
  startDate: string | null;        // NEW
  endDate: string | null;          // NEW
  clientName: string | null;       // NEW
  budgetHours: string | null;      // NEW
  createdAt: string;               // NEW
  updatedAt: string;               // NEW
}
```

#### 2. Update UI Components

```typescript
// Project Card Component
const ProjectCard = ({ project }: { project: Project }) => {
  return (
    <div className="project-card">
      <h3>{project.name}</h3>
      <p className="code">{project.code}</p>

      {/* NEW: Display metadata */}
      {project.description && (
        <p className="description">{project.description}</p>
      )}

      {project.clientName && (
        <div className="client">
          <Icon name="building" />
          <span>{project.clientName}</span>
        </div>
      )}

      {(project.startDate || project.endDate) && (
        <div className="timeline">
          <Icon name="calendar" />
          <span>
            {project.startDate && formatDate(project.startDate)}
            {project.startDate && project.endDate && ' - '}
            {project.endDate && formatDate(project.endDate)}
          </span>
        </div>
      )}

      {project.budgetHours && (
        <div className="budget">
          <Icon name="clock" />
          <span>{project.budgetHours} hours budgeted</span>
        </div>
      )}

      <div className="meta">
        <small>Updated {formatRelativeTime(project.updatedAt)}</small>
      </div>
    </div>
  );
};
```

#### 3. Update Forms

```typescript
// Project Creation Form
const CreateProjectForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    startDate: '',
    endDate: '',
    clientName: '',
    budgetHours: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Convert empty strings to null
    const payload = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [
        key,
        value === '' ? null : value
      ])
    );

    // Convert budgetHours to number
    if (payload.budgetHours) {
      payload.budgetHours = parseFloat(payload.budgetHours);
    }

    const response = await fetch('/api/v1/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Handle response...
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Existing fields */}
      <input
        name="name"
        placeholder="Project Name"
        required
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />

      <input
        name="code"
        placeholder="Project Code"
        value={formData.code}
        onChange={(e) => setFormData({...formData, code: e.target.value})}
      />

      {/* NEW: Extended fields */}
      <textarea
        name="description"
        placeholder="Project Description (optional)"
        maxLength={2000}
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
      />

      <input
        type="date"
        name="startDate"
        placeholder="Start Date"
        value={formData.startDate}
        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
      />

      <input
        type="date"
        name="endDate"
        placeholder="End Date"
        value={formData.endDate}
        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
      />

      <input
        name="clientName"
        placeholder="Client Name (optional)"
        maxLength={255}
        value={formData.clientName}
        onChange={(e) => setFormData({...formData, clientName: e.target.value})}
      />

      <input
        type="number"
        name="budgetHours"
        placeholder="Budget Hours (optional)"
        min="0"
        step="0.5"
        value={formData.budgetHours}
        onChange={(e) => setFormData({...formData, budgetHours: e.target.value})}
      />

      <button type="submit">Create Project</button>
    </form>
  );
};
```

#### 4. Replace Individual Assignments with Bulk

```typescript
// Before: Adding members one by one
const addMembersOld = async (projectId, userIds) => {
  for (const userId of userIds) {
    try {
      await fetch(`/api/v1/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, role: 'member' })
      });
    } catch (error) {
      console.error(`Failed to add ${userId}`);
    }
  }
};

// After: Using bulk endpoint
const addMembers = async (projectId, userIds) => {
  const response = await fetch(
    `/api/v1/projects/${projectId}/members/bulk`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userIds,
        role: 'member'
      })
    }
  );

  const result = await response.json();

  // Single request, detailed results
  return result;
};
```

---

## Code Examples

### Complete Project Dashboard

```typescript
const ProjectDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    active: true,
    search: '',
    clientName: '',
  });

  useEffect(() => {
    fetchProjects();
  }, [filter]);

  const fetchProjects = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.active !== null) params.append('active', filter.active.toString());
    if (filter.search) params.append('search', filter.search);

    const response = await fetch(`/api/v1/projects?${params}`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });

    const { data } = await response.json();
    setProjects(data);
    setLoading(false);
  };

  // Filter projects by client on frontend
  const filteredProjects = projects.filter(project => {
    if (!filter.clientName) return true;
    return project.clientName?.toLowerCase().includes(filter.clientName.toLowerCase());
  });

  return (
    <div className="dashboard">
      <h1>Projects</h1>

      <Filters>
        <input
          placeholder="Search projects..."
          value={filter.search}
          onChange={(e) => setFilter({...filter, search: e.target.value})}
        />
        <input
          placeholder="Filter by client..."
          value={filter.clientName}
          onChange={(e) => setFilter({...filter, clientName: e.target.value})}
        />
        <select
          value={filter.active?.toString() || ''}
          onChange={(e) => setFilter({...filter, active: e.target.value === 'true'})}
        >
          <option value="">All Projects</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </Filters>

      {loading ? (
        <Spinner />
      ) : (
        <ProjectGrid projects={filteredProjects} />
      )}
    </div>
  );
};

const ProjectGrid = ({ projects }) => {
  return (
    <div className="project-grid">
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
};
```

---

## Summary

### What's New

1. **7 New Project Fields**: description, startDate, endDate, clientName, budgetHours, createdAt, updatedAt
2. **1 New Endpoint**: POST `/api/v1/projects/:id/members/bulk`
3. **Enhanced Responses**: All project endpoints now return complete metadata
4. **Better Tracking**: Automatic timestamps for audit trails

### Breaking Changes

**None!** All new fields are optional and backwards compatible.

- Existing API calls continue to work
- Old response structures are extended (not changed)
- Frontend can adopt new fields gradually

### Next Steps

1. ✅ Update TypeScript types
2. ✅ Add new fields to creation/update forms (optional)
3. ✅ Display metadata in project cards/details
4. ✅ Use bulk assignment for team setup
5. ✅ Test with demo data from seed script

---

**Last Updated:** November 2025
**API Version:** v1
**Status:** Production Ready ✅
