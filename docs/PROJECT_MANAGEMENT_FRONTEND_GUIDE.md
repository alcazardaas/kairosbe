# Project Management - Frontend Integration Guide

## Overview

This guide provides complete documentation for integrating the Kairos project management features into your frontend application. All endpoints are production-ready and follow the tenant handling pattern defined in CLAUDE.md.

**Base URL:** `/api/v1`

**Authentication:** All endpoints require a valid session token in the `Authorization` header.

---

## 🆕 NEW FEATURES AVAILABLE!

**See [PROJECT_MANAGEMENT_NEW_FEATURES.md](./PROJECT_MANAGEMENT_NEW_FEATURES.md) for:**
- ✨ **Extended Project Metadata** (description, dates, client, budget, timestamps)
- ✨ **Bulk Member Assignment** (add multiple users at once)
- ✨ **Complete migration guide** with code examples
- ✨ **Updated TypeScript types** and best practices

**All new features are backwards compatible!**

---

## Table of Contents

1. [Authentication & Tenant Handling](#authentication--tenant-handling)
2. [Project CRUD Operations](#project-crud-operations)
3. [Project Member Management](#project-member-management)
4. [User's Assigned Projects](#users-assigned-projects)
5. [Project Search](#project-search)
6. [Time Entry with Projects](#time-entry-with-projects)
7. [Project Statistics](#project-statistics)
8. [Role-Based Access Control](#role-based-access-control)
9. [Error Handling](#error-handling)
10. [Complete Examples](#complete-examples)

---

## Authentication & Tenant Handling

### IMPORTANT: How Tenant Context Works

**The frontend NEVER sends `tenant_id` in request parameters, query params, or request bodies.**

#### Session-Based Tenant Isolation

1. **Login** - Receive tenant context from session
2. **All Requests** - Tenant ID automatically extracted from session token
3. **Backend** - Applies tenant filtering automatically

```typescript
// ✅ CORRECT: Login and store session token
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'manager@demo.com',
    password: 'password123'
  })
});

const { sessionToken, tenantId, userId } = await response.json();

// Store for display purposes only
localStorage.setItem('sessionToken', sessionToken);
localStorage.setItem('tenantId', tenantId); // For UI display ONLY

// ✅ CORRECT: All subsequent requests
fetch('/api/v1/projects', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  }
  // NO tenant_id needed!
});

// ❌ WRONG: Don't send tenant_id
fetch('/api/v1/projects', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  },
  body: JSON.stringify({
    tenant_id: tenantId, // ❌ NEVER DO THIS
    name: 'Project Name'
  })
});
```

---

## Project CRUD Operations

### 1. List All Projects

**GET** `/api/v1/projects`

List all projects for the authenticated user's tenant with pagination, filtering, and sorting.

**Query Parameters:**
- `page` (number, optional, default: 1) - Page number
- `limit` (number, optional, default: 20, max: 100) - Items per page
- `sort` (string, optional) - Sort format: `field:asc` or `field:desc`
  - Valid fields: `id`, `name`, `code`, `active`
  - Example: `name:asc`, `code:desc`
- `active` (boolean, optional) - Filter by active status
- `search` (string, optional, max 255 chars) - Search by project name (case-insensitive)

**Response:**
```typescript
{
  data: Array<{
    id: string;           // UUID
    tenantId: string;     // UUID (for reference only)
    name: string;
    code: string | null;
    active: boolean;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
```

**Example:**
```typescript
// Fetch active projects, sorted by name
const response = await fetch(
  '/api/v1/projects?active=true&sort=name:asc&page=1&limit=20',
  {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  }
);

const { data, meta } = await response.json();

// Search for projects
const searchResults = await fetch(
  '/api/v1/projects?search=website',
  {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  }
);
```

**Access:** All authenticated users (employee, manager, admin)

---

### 2. Get Single Project

**GET** `/api/v1/projects/:id`

Retrieve details of a specific project.

**Path Parameters:**
- `id` (string, required) - Project UUID

**Response:**
```typescript
{
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  active: boolean;
}
```

**Example:**
```typescript
const response = await fetch(
  `/api/v1/projects/${projectId}`,
  {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  }
);

const project = await response.json();
```

**Access:** All authenticated users

**Errors:**
- `404 Not Found` - Project doesn't exist or doesn't belong to user's tenant

---

### 3. Create Project

**POST** `/api/v1/projects`

Create a new project within the tenant.

**Request Body:**
```typescript
{
  name: string;          // Required, 1-255 characters
  code?: string | null;  // Optional, max 50 characters
  active?: boolean;      // Optional, default: true
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
    active: true
  })
});

const newProject = await response.json();
```

**Access:** Admin, Manager only

**Errors:**
- `400 Bad Request` - Validation errors (missing name, invalid format)
- `403 Forbidden` - User doesn't have admin or manager role
- `409 Conflict` - Project with this name already exists for the tenant

---

### 4. Update Project

**PATCH** `/api/v1/projects/:id`

Update an existing project. Only provided fields will be updated.

**Path Parameters:**
- `id` (string, required) - Project UUID

**Request Body:** (all fields optional)
```typescript
{
  name?: string;         // 1-255 characters
  code?: string | null;  // max 50 characters
  active?: boolean;
}
```

**Response:**
```typescript
{
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  active: boolean;
}
```

**Example:**
```typescript
// Deactivate a project
const response = await fetch(`/api/v1/projects/${projectId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    active: false
  })
});

const updatedProject = await response.json();

// Update name and code
await fetch(`/api/v1/projects/${projectId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Website Redesign V2',
    code: 'WEB-002'
  })
});
```

**Access:** Admin, Manager only

**Errors:**
- `400 Bad Request` - Validation errors
- `403 Forbidden` - User doesn't have admin or manager role
- `404 Not Found` - Project doesn't exist
- `409 Conflict` - Project name already exists for tenant

---

### 5. Delete Project

**DELETE** `/api/v1/projects/:id`

Permanently delete a project. This will cascade delete related project memberships and may affect time entries.

**Path Parameters:**
- `id` (string, required) - Project UUID

**Response:** 204 No Content

**Example:**
```typescript
await fetch(`/api/v1/projects/${projectId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  }
});
```

**Access:** Admin only (stricter than create/update)

**Errors:**
- `403 Forbidden` - User doesn't have admin role
- `404 Not Found` - Project doesn't exist

**⚠️ Warning:** Deleting a project will remove all project memberships. Consider deactivating the project instead.

---

## Project Member Management

### 6. List Project Members

**GET** `/api/v1/projects/:id/members`

Get all users assigned to a specific project with their user details.

**Path Parameters:**
- `id` (string, required) - Project UUID

**Response:**
```typescript
{
  data: Array<{
    id: string;              // Membership UUID
    userId: string;
    role: string;            // 'member', 'lead', 'observer'
    createdAt: string;       // ISO 8601 datetime
    user: {
      id: string;
      email: string;
      name: string;
    };
  }>;
}
```

**Example:**
```typescript
const response = await fetch(
  `/api/v1/projects/${projectId}/members`,
  {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  }
);

const { data: members } = await response.json();

// Display members in UI
members.forEach(member => {
  console.log(`${member.user.name} (${member.role}) - joined ${member.createdAt}`);
});
```

**Access:** All authenticated users

**Errors:**
- `404 Not Found` - Project doesn't exist or doesn't belong to user's tenant

---

### 7. Add Member to Project

**POST** `/api/v1/projects/:id/members`

Assign a user to a project with an optional role.

**Path Parameters:**
- `id` (string, required) - Project UUID

**Request Body:**
```typescript
{
  userId: string;      // Required, UUID of user to assign
  role?: string;       // Optional, default: 'member'
                       // Valid values: 'member', 'lead', 'observer'
}
```

**Response:** (201 Created)
```typescript
{
  data: {
    id: string;              // Membership UUID
    tenantId: string;
    projectId: string;
    userId: string;
    role: string;
    createdAt: string;
  };
}
```

**Example:**
```typescript
// Assign user as regular member
const response = await fetch(
  `/api/v1/projects/${projectId}/members`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: employeeId,
      role: 'member'
    })
  }
);

const { data: membership } = await response.json();

// Assign user as project lead
await fetch(
  `/api/v1/projects/${projectId}/members`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: leadId,
      role: 'lead'
    })
  }
);
```

**Access:** Admin, Manager only

**Errors:**
- `400 Bad Request` - Invalid userId or user doesn't exist in tenant
- `403 Forbidden` - User doesn't have admin or manager role
- `404 Not Found` - Project doesn't exist
- `409 Conflict` - User is already a member of this project

---

### 8. Remove Member from Project

**DELETE** `/api/v1/projects/:id/members/:userId`

Remove a user's assignment from a project.

**Path Parameters:**
- `id` (string, required) - Project UUID
- `userId` (string, required) - User UUID to remove

**Response:** 204 No Content

**Example:**
```typescript
await fetch(
  `/api/v1/projects/${projectId}/members/${userId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  }
);
```

**Access:** Admin, Manager only

**Errors:**
- `403 Forbidden` - User doesn't have admin or manager role
- `404 Not Found` - Project or membership doesn't exist

---

## User's Assigned Projects

### 9. Get My Assigned Projects

**GET** `/api/v1/my/projects`

Retrieve all projects the current authenticated user is assigned to. This endpoint automatically uses the current user's ID from the session.

**Query Parameters:** None

**Response:**
```typescript
{
  data: Array<{
    id: string;
    name: string;
    code: string | null;
    active: boolean;
    tenantId: string;
    memberRole: string;      // User's role in this project
    memberSince: string;     // ISO 8601 datetime when user was assigned
  }>;
}
```

**Example:**
```typescript
// Get projects I can log time to
const response = await fetch('/api/v1/my/projects', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  }
});

const { data: myProjects } = await response.json();

// Build project dropdown for time entry form
const projectOptions = myProjects
  .filter(p => p.active)
  .map(p => ({
    value: p.id,
    label: `${p.code ? p.code + ' - ' : ''}${p.name}`,
    role: p.memberRole
  }));
```

**Access:** All authenticated users

**Use Cases:**
- Display project dropdown in time entry forms
- Show user's project assignments on profile page
- Filter projects user can log time to
- Display active project count on dashboard

---

## Project Search

### 10. Search Projects

**GET** `/api/v1/search/projects`

Quick search for projects by name. Returns active projects only, limited to 10 results by default.

**Query Parameters:**
- `q` (string, required) - Search query (case-insensitive)
- `limit` (number, optional, default: 10, max: 50) - Maximum results to return

**Response:**
```typescript
{
  data: Array<{
    id: string;
    tenantId: string;
    name: string;
    code: string | null;
    active: boolean;
  }>;
}
```

**Example:**
```typescript
// Autocomplete/typeahead search
const handleProjectSearch = async (searchTerm: string) => {
  const response = await fetch(
    `/api/v1/search/projects?q=${encodeURIComponent(searchTerm)}&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    }
  );

  const { data: results } = await response.json();
  return results;
};

// Usage in autocomplete component
const projects = await handleProjectSearch('web');
// Returns: [{ name: 'Website Redesign', code: 'WEB-001', ... }]
```

**Access:** All authenticated users

**Note:** This endpoint is optimized for typeahead/autocomplete UI components. For full project listing with pagination, use `GET /api/v1/projects`.

---

## Time Entry with Projects

### 11. Create Time Entry (Project Validation)

**POST** `/api/v1/time-entries`

Create a time entry. The backend automatically validates that the user is assigned to the specified project.

**Request Body:**
```typescript
{
  userId: string;        // Required
  projectId: string;     // Required - must be a project user is assigned to
  taskId?: string;       // Optional
  weekStartDate: string; // Required, format: YYYY-MM-DD
  date: string;          // Required, format: YYYY-MM-DD
  hours: number;         // Required, must be > 0
  note?: string;         // Optional
}
```

**Response:** (201 Created)
```typescript
{
  id: string;
  tenantId: string;
  timesheetId: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  date: string;
  hours: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Example:**
```typescript
// Create time entry - backend validates project assignment
const response = await fetch('/api/v1/time-entries', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: currentUserId,
    projectId: selectedProjectId,
    weekStartDate: '2025-11-04',
    date: '2025-11-05',
    hours: 8,
    note: 'Frontend development work'
  })
});

const timeEntry = await response.json();
```

**Access:** All authenticated users (for their own time entries)

**Errors:**
- `403 Forbidden` - User is not assigned to the specified project
- `400 Bad Request` - Validation errors (invalid project, hours, date, etc.)

**⚠️ Important:** The backend validates project membership automatically. Users can only log time to projects they're assigned to.

---

## Project Statistics

### 12. User's Project Hours Breakdown

**GET** `/api/v1/time-entries/stats/user-projects/:userId`

Get a breakdown of hours logged per project for a specific user, with optional date filtering.

**Path Parameters:**
- `userId` (string, required) - User UUID

**Query Parameters:**
- `startDate` (string, optional) - Format: YYYY-MM-DD
- `endDate` (string, optional) - Format: YYYY-MM-DD
- `weekStartDate` (string, optional) - Format: YYYY-MM-DD (alternative to date range)

**Response:**
```typescript
{
  userId: string;
  totalHours: number;
  projects: Array<{
    projectId: string;
    projectName: string;
    totalHours: number;
    percentage: number;    // Percentage of total hours
  }>;
}
```

**Example:**
```typescript
// Get project breakdown for current month
const response = await fetch(
  `/api/v1/time-entries/stats/user-projects/${userId}?startDate=2025-11-01&endDate=2025-11-30`,
  {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  }
);

const { totalHours, projects } = await response.json();

// Display in chart
projects.forEach(project => {
  console.log(
    `${project.projectName}: ${project.totalHours}h (${project.percentage}%)`
  );
});

// Example output:
// Website Redesign: 40h (50%)
// Mobile App: 30h (37.5%)
// API Integration: 10h (12.5%)
```

**Access:** All authenticated users (typically restricted by business logic to own data or team members)

---

## Role-Based Access Control

### Permission Summary

| Endpoint | Employee | Manager | Admin |
|----------|----------|---------|-------|
| GET /projects | ✅ | ✅ | ✅ |
| GET /projects/:id | ✅ | ✅ | ✅ |
| POST /projects | ❌ | ✅ | ✅ |
| PATCH /projects/:id | ❌ | ✅ | ✅ |
| DELETE /projects/:id | ❌ | ❌ | ✅ |
| GET /projects/:id/members | ✅ | ✅ | ✅ |
| POST /projects/:id/members | ❌ | ✅ | ✅ |
| DELETE /projects/:id/members/:userId | ❌ | ✅ | ✅ |
| GET /my/projects | ✅ | ✅ | ✅ |
| GET /search/projects | ✅ | ✅ | ✅ |

### Handling Permission Errors

```typescript
const handleCreateProject = async (projectData) => {
  try {
    const response = await fetch('/api/v1/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectData)
    });

    if (response.status === 403) {
      // User doesn't have permission
      showError('You need admin or manager permissions to create projects');
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to create project');
    }

    const project = await response.json();
    return project;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};
```

---

## Error Handling

### Common Error Responses

All error responses follow this format:

```typescript
{
  error: string;        // Error type
  message: string;      // Human-readable error message
  statusCode: number;   // HTTP status code
}
```

### Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Validation errors, invalid input data |
| 401 | Unauthorized | Missing or invalid session token |
| 403 | Forbidden | Insufficient permissions (role-based) |
| 404 | Not Found | Resource doesn't exist or wrong tenant |
| 409 | Conflict | Duplicate project name, member already assigned |
| 500 | Internal Server Error | Unexpected server error |

### Error Handling Best Practices

```typescript
const apiCall = async (endpoint: string, options: RequestInit) => {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Handle specific status codes
    if (response.status === 401) {
      // Session expired - redirect to login
      redirectToLogin();
      return;
    }

    if (response.status === 403) {
      // Permission denied
      const error = await response.json();
      showNotification('error', error.message);
      return;
    }

    if (response.status === 404) {
      showNotification('error', 'Resource not found');
      return;
    }

    if (response.status === 409) {
      const error = await response.json();
      showNotification('warning', error.message);
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    // Success - parse response if not 204
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    showNotification('error', 'An unexpected error occurred');
    throw error;
  }
};
```

---

## Complete Examples

### Example 1: Project Management Dashboard

```typescript
interface Project {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
  memberCount?: number;
}

const ProjectDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/projects?page=${page}&limit=20&sort=name:asc&active=true`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          }
        }
      );

      const { data, meta } = await response.json();
      setProjects(data);
      setTotal(meta.total);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [page]);

  return (
    <div>
      <h1>Projects ({total})</h1>
      <ProjectList projects={projects} loading={loading} />
      <Pagination page={page} total={total} onPageChange={setPage} />
    </div>
  );
};
```

### Example 2: Time Entry Form with Project Selection

```typescript
const TimeEntryForm = () => {
  const [myProjects, setMyProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    // Fetch projects user can log time to
    fetch('/api/v1/my/projects', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    })
      .then(res => res.json())
      .then(({ data }) => {
        // Filter to active projects only
        setMyProjects(data.filter(p => p.active));
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/v1/time-entries', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUserId,
          projectId: selectedProject,
          weekStartDate: getMonday(new Date()),
          date: new Date().toISOString().split('T')[0],
          hours: parseFloat(hours),
          note: note || null
        })
      });

      if (response.status === 403) {
        alert('You are not assigned to this project');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to create time entry');
      }

      alert('Time entry created successfully!');
      // Reset form
      setSelectedProject('');
      setHours('');
      setNote('');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create time entry');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Project:
        <select
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          required
        >
          <option value="">Select a project</option>
          {myProjects.map(project => (
            <option key={project.id} value={project.id}>
              {project.code ? `${project.code} - ` : ''}{project.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Hours:
        <input
          type="number"
          step="0.25"
          min="0.25"
          max="24"
          value={hours}
          onChange={e => setHours(e.target.value)}
          required
        />
      </label>

      <label>
        Note:
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Optional description"
        />
      </label>

      <button type="submit">Log Time</button>
    </form>
  );
};
```

### Example 3: Project Management (Admin/Manager)

```typescript
const ProjectManagement = ({ userRole }) => {
  const canManage = ['admin', 'manager'].includes(userRole);
  const canDelete = userRole === 'admin';

  const createProject = async (projectData) => {
    if (!canManage) {
      alert('You need manager or admin permissions');
      return;
    }

    const response = await fetch('/api/v1/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectData)
    });

    if (response.status === 403) {
      alert('Insufficient permissions');
      return;
    }

    if (response.status === 409) {
      const error = await response.json();
      alert(error.message); // "Project with name 'X' already exists"
      return;
    }

    return await response.json();
  };

  const assignMember = async (projectId, userId, role = 'member') => {
    if (!canManage) {
      alert('You need manager or admin permissions');
      return;
    }

    const response = await fetch(`/api/v1/projects/${projectId}/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, role })
    });

    if (response.status === 409) {
      alert('User is already a member of this project');
      return;
    }

    return await response.json();
  };

  const deleteProject = async (projectId) => {
    if (!canDelete) {
      alert('Only admins can delete projects');
      return;
    }

    if (!confirm('Are you sure? This will remove all project memberships.')) {
      return;
    }

    await fetch(`/api/v1/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    alert('Project deleted successfully');
  };

  return (
    <div>
      {canManage && <CreateProjectButton onClick={createProject} />}
      <ProjectList
        onAssign={canManage ? assignMember : null}
        onDelete={canDelete ? deleteProject : null}
      />
    </div>
  );
};
```

### Example 4: Project Search with Autocomplete

```typescript
const ProjectSearchAutocomplete = ({ onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/v1/search/projects?q=${encodeURIComponent(searchTerm)}&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            }
          }
        );

        const { data } = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="autocomplete">
      <input
        type="text"
        placeholder="Search projects..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />

      {loading && <div>Searching...</div>}

      {results.length > 0 && (
        <ul className="results">
          {results.map(project => (
            <li
              key={project.id}
              onClick={() => {
                onSelect(project);
                setSearchTerm('');
                setResults([]);
              }}
            >
              {project.code && <span className="code">{project.code}</span>}
              <span className="name">{project.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## Testing with Demo Data

### Running the Seed Script

```bash
pnpm tsx src/db/seed-manager-team.ts
```

### Demo Credentials

- **Manager:** `manager@demo.com` / `password123`
  - Can create, edit projects
  - Can assign members
  - Assigned to all 4 projects as observer

- **Employee 1:** `bob@demo.com` / `password123`
  - Assigned to 2 projects (Website Redesign, Mobile App)

- **Employee 2:** `carol@demo.com` / `password123`
  - Assigned to 2 projects (API Integration, Internal Tools)

### Demo Projects Created

1. **Website Redesign** (WEB-001)
2. **Mobile App Development** (MOB-001)
3. **API Integration** (API-001)
4. **Internal Tools** (INT-001)

### Test Scenarios

1. **Login as employee** → Get assigned projects → Create time entry
2. **Login as manager** → Create new project → Assign team members
3. **Login as admin** → Delete project → Verify cascade behavior
4. **Search projects** → Test autocomplete functionality
5. **View project stats** → Check hours breakdown by project

---

## Summary

### Key Points to Remember

1. **Never send tenant_id** - It's extracted from the session automatically
2. **Always include Authorization header** - Use the session token from login
3. **Check user role** - Restrict UI features based on permissions
4. **Validate on frontend** - But trust backend validation as source of truth
5. **Handle errors gracefully** - Provide clear feedback to users
6. **Use /my/projects** - For time entry forms and user-specific project lists
7. **Project membership is enforced** - Users can only log time to assigned projects

### Best Practices

- Cache project lists locally to reduce API calls
- Implement debounced search for better UX
- Show loading states during async operations
- Provide clear error messages to users
- Use optimistic UI updates where appropriate
- Validate inputs on frontend before sending
- Handle all HTTP status codes appropriately

---

## Support

For questions or issues:
- Check [USER_STORIES_COMPLETE.md](./USER_STORIES_COMPLETE.md) for detailed feature specifications
- Review [CLAUDE.md](../CLAUDE.md) for architectural patterns
- Test with Postman collections in `/postman` directory

**API Version:** v1
**Last Updated:** November 2025
**Status:** Production Ready ✅
