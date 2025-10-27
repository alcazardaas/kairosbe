# Users/Employees API Endpoint - Frontend Integration Guide

## Overview
New `GET /users` endpoint for retrieving a paginated list of employees within a tenant. This endpoint is designed for the team management page.

**Access:** Admin and Manager roles only
**Base URL:** `/api/v1/users`
**Method:** `GET`
**Authentication:** Session token (Bearer)

---

## Authentication

All requests must include a session token in the Authorization header:

```http
Authorization: Bearer <session-token>
```

---

## Request Parameters

All parameters are optional and passed as query parameters:

| Parameter | Type | Description | Example | Default |
|-----------|------|-------------|---------|---------|
| `page` | number | Page number (min: 1) | `1` | `1` |
| `limit` | number | Items per page (min: 1, max: 100) | `20` | `20` |
| `sort` | string | Sort field and direction | `name:asc` | `name:asc` |
| `q` | string | Search by name or email | `john` | - |
| `role` | enum | Filter by role | `employee` | - |
| `status` | enum | Filter by status | `active` | - |
| `manager_id` | string (UUID) | Filter by manager (shows direct reports) | `uuid` | - |

### Enums

**role:**
- `admin`
- `manager`
- `employee`

**status:**
- `active` - Active member
- `invited` - Invitation sent, not yet accepted
- `disabled` - Deactivated member

**sort fields:**
- `name:asc` / `name:desc`
- `email:asc` / `email:desc`
- `created_at:asc` / `created_at:desc`
- `role:asc` / `role:desc`
- `status:asc` / `status:desc`

---

## Response Format

### Success Response (200 OK)

```typescript
interface UserListResponse {
  data: Employee[];
  meta: PaginationMeta;
}

interface Employee {
  id: string;
  email: string;
  name: string | null;
  locale: string | null;
  createdAt: string; // ISO 8601
  lastLoginAt: string | null; // ISO 8601
  membership: Membership;
  profile: Profile | null;
}

interface Membership {
  role: 'admin' | 'manager' | 'employee';
  status: 'active' | 'invited' | 'disabled';
  createdAt: string; // ISO 8601
}

interface Profile {
  jobTitle: string | null;
  startDate: string | null; // YYYY-MM-DD
  managerUserId: string | null; // UUID
  location: string | null;
  phone: string | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### Example Success Response

```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "locale": "en",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "lastLoginAt": "2025-01-20T14:30:00.000Z",
      "membership": {
        "role": "employee",
        "status": "active",
        "createdAt": "2025-01-15T10:00:00.000Z"
      },
      "profile": {
        "jobTitle": "Software Engineer",
        "startDate": "2025-01-01",
        "managerUserId": "123e4567-e89b-12d3-a456-426614174002",
        "location": "New York, NY",
        "phone": "+1-555-0123"
      }
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174003",
      "email": "jane.smith@example.com",
      "name": "Jane Smith",
      "locale": "en",
      "createdAt": "2025-01-16T11:00:00.000Z",
      "lastLoginAt": "2025-01-21T09:15:00.000Z",
      "membership": {
        "role": "manager",
        "status": "active",
        "createdAt": "2025-01-16T11:00:00.000Z"
      },
      "profile": {
        "jobTitle": "Engineering Manager",
        "startDate": "2024-06-01",
        "managerUserId": null,
        "location": "San Francisco, CA",
        "phone": "+1-555-0124"
      }
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

---

## Error Responses

### 400 Bad Request - Invalid Query Parameters

```json
{
  "statusCode": 400,
  "error": "Validation failed",
  "message": "page: Number must be greater than or equal to 1"
}
```

### 401 Unauthorized - Invalid/Expired Session

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired session token"
}
```

### 403 Forbidden - Insufficient Permissions

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Access denied. Required roles: admin, manager"
}
```

---

## Usage Examples

### 1. Fetch All Active Employees (Basic)

```typescript
// Vanilla fetch
const response = await fetch('/api/v1/users?status=active', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

```typescript
// Axios
const response = await axios.get('/api/v1/users', {
  params: { status: 'active' },
  headers: { 'Authorization': `Bearer ${sessionToken}` }
});
const data = response.data;
```

### 2. Search by Name/Email

```typescript
const response = await fetch(
  `/api/v1/users?q=${encodeURIComponent(searchQuery)}`,
  {
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  }
);
```

### 3. Filter by Role

```typescript
const response = await axios.get('/api/v1/users', {
  params: {
    role: 'employee',
    status: 'active',
    page: 1,
    limit: 50
  },
  headers: { 'Authorization': `Bearer ${sessionToken}` }
});
```

### 4. Get Manager's Direct Reports

```typescript
const managerId = '123e4567-e89b-12d3-a456-426614174002';
const response = await fetch(`/api/v1/users?manager_id=${managerId}`, {
  headers: { 'Authorization': `Bearer ${sessionToken}` }
});
```

### 5. Pagination with Sorting

```typescript
const response = await axios.get('/api/v1/users', {
  params: {
    page: 2,
    limit: 25,
    sort: 'name:asc'
  },
  headers: { 'Authorization': `Bearer ${sessionToken}` }
});
```

### 6. Combined Filters

```typescript
const response = await fetch(
  '/api/v1/users?' + new URLSearchParams({
    q: 'john',
    role: 'employee',
    status: 'active',
    page: '1',
    limit: '10',
    sort: 'name:asc'
  }),
  {
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  }
);
```

---

## React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface UseUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'admin' | 'manager' | 'employee';
  status?: 'active' | 'invited' | 'disabled';
  managerId?: string;
  sort?: string;
}

function useUsers(params: UseUsersParams) {
  const [data, setData] = useState<Employee[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.set('page', params.page.toString());
        if (params.limit) queryParams.set('limit', params.limit.toString());
        if (params.search) queryParams.set('q', params.search);
        if (params.role) queryParams.set('role', params.role);
        if (params.status) queryParams.set('status', params.status);
        if (params.managerId) queryParams.set('manager_id', params.managerId);
        if (params.sort) queryParams.set('sort', params.sort);

        const response = await fetch(`/api/v1/users?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${getSessionToken()}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result.data);
        setMeta(result.meta);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [
    params.page,
    params.limit,
    params.search,
    params.role,
    params.status,
    params.managerId,
    params.sort
  ]);

  return { data, meta, loading, error };
}

// Usage in component
function EmployeeList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, meta, loading, error } = useUsers({
    page,
    limit: 20,
    search,
    status: 'active',
    sort: 'name:asc'
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <input
        type="text"
        placeholder="Search employees..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Job Title</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.name || 'N/A'}</td>
              <td>{employee.email}</td>
              <td>{employee.membership.role}</td>
              <td>{employee.profile?.jobTitle || 'N/A'}</td>
              <td>{employee.membership.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {meta && (
        <div>
          Page {meta.page} of {meta.totalPages} ({meta.total} total)
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
            Previous
          </button>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= meta.totalPages}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Implementation Checklist for Frontend

- [ ] Create TypeScript interfaces for Employee, Membership, Profile, PaginationMeta
- [ ] Implement API service/hook for fetching users
- [ ] Add search input with debouncing (recommended: 300-500ms delay)
- [ ] Implement role filter dropdown (admin, manager, employee)
- [ ] Implement status filter dropdown (active, invited, disabled)
- [ ] Add pagination controls (previous, next, page selector)
- [ ] Add sorting controls for table columns
- [ ] Handle loading states (skeleton, spinner)
- [ ] Handle error states (toast, inline message)
- [ ] Handle empty states (no users found)
- [ ] Add manager filter for viewing direct reports (if needed)
- [ ] Test with different user roles (admin vs manager permissions)
- [ ] Test edge cases (empty results, network errors, expired token)

---

## Notes

1. **Profile is Optional:** Not all users may have profile information. Handle `null` profile gracefully in UI.
2. **Debounce Search:** Implement debouncing on search input to avoid excessive API calls.
3. **Pagination:** `totalPages` is calculated as `Math.ceil(total / limit)` for convenience.
4. **Authorization:** Only admins and managers can access this endpoint. Regular employees will receive a 403 Forbidden error.
5. **Session Token:** Obtain from `/api/v1/auth/login` or `/api/v1/auth/refresh` endpoints.
6. **Manager Filter:** Use `manager_id` parameter to show only direct reports of a specific manager.
7. **Date Formats:**
   - `createdAt`, `lastLoginAt`: ISO 8601 with timezone (e.g., `2025-01-15T10:00:00.000Z`)
   - `startDate`: Date only (e.g., `2025-01-01`)

---

## Testing the Endpoint

### curl Examples

```bash
# Basic request
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/users

# With search and filters
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/users?q=john&role=employee&status=active&page=1&limit=20"

# Manager's direct reports
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/users?manager_id=<manager-uuid>"

# Sorted by name descending
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/users?sort=name:desc"
```

---

## Related Endpoints

- `POST /api/v1/auth/login` - Obtain session token
- `GET /api/v1/auth/me` - Get current user info (includes role)
- `GET /api/v1/leave-requests?team=true` - View team leave requests (managers)
- `GET /api/v1/timesheets?team=true` - View team timesheets (managers)

---

For questions or issues, contact the backend team or open an issue in the repository.
