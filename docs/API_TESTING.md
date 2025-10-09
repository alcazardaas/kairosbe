# API Testing Guide - Projects Module

This document provides example curl commands to test the Projects CRUD endpoints.

## Prerequisites

1. Start the server: `pnpm dev`
2. Ensure the database is running (in the kairosdb project)
3. Seed test data: `pnpm exec tsx scripts/seed-test-data.ts`

The test tenant ID is: `00000000-0000-0000-0000-000000000001`

---

## Endpoints

### 1. Create Project

```bash
curl -X POST "http://localhost:3000/api/v1/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "name": "My New Project",
    "code": "MNP-001",
    "active": true
  }'
```

**Expected Response:**
```json
{
  "id": "uuid-here",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "name": "My New Project",
  "code": "MNP-001",
  "active": true
}
```

### 2. List Projects (with Pagination)

```bash
# Default (page 1, limit 20)
curl "http://localhost:3000/api/v1/projects"

# With pagination
curl "http://localhost:3000/api/v1/projects?page=1&limit=10"

# Filter by tenant
curl "http://localhost:3000/api/v1/projects?tenant_id=00000000-0000-0000-0000-000000000001"

# Filter by active status
curl "http://localhost:3000/api/v1/projects?active=true"

# Search by name
curl "http://localhost:3000/api/v1/projects?search=Backend"

# Sort by name ascending
curl "http://localhost:3000/api/v1/projects?sort=name:asc"

# Sort by created date descending
curl "http://localhost:3000/api/v1/projects?sort=id:desc"

# Combine filters
curl "http://localhost:3000/api/v1/projects?active=true&search=API&sort=name:asc&page=1&limit=5"
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "uuid-here",
      "tenantId": "00000000-0000-0000-0000-000000000001",
      "name": "Project Name",
      "code": "CODE",
      "active": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

### 3. Get Single Project

```bash
curl "http://localhost:3000/api/v1/projects/{project-id}"
```

**Expected Response:**
```json
{
  "id": "uuid-here",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "name": "Project Name",
  "code": "CODE",
  "active": true
}
```

### 4. Update Project

```bash
curl -X PATCH "http://localhost:3000/api/v1/projects/{project-id}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Project Name",
    "code": "NEW-CODE",
    "active": false
  }'
```

**Note:** All fields are optional in PATCH requests.

**Expected Response:**
```json
{
  "id": "uuid-here",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "name": "Updated Project Name",
  "code": "NEW-CODE",
  "active": false
}
```

### 5. Delete Project

```bash
curl -X DELETE "http://localhost:3000/api/v1/projects/{project-id}"
```

**Expected Response:** HTTP 204 No Content

---

## Error Cases

### Validation Errors (400)

```bash
# Invalid UUID format
curl -X POST "http://localhost:3000/api/v1/projects" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "invalid-uuid", "name": "Test"}'

# Empty name
curl -X POST "http://localhost:3000/api/v1/projects" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "00000000-0000-0000-0000-000000000001", "name": ""}'
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "error": "Validation failed",
  "message": "tenant_id: Invalid tenant_id format"
}
```

### Not Found (404)

```bash
curl "http://localhost:3000/api/v1/projects/00000000-0000-0000-0000-000000000999"
```

**Expected Response:**
```json
{
  "message": "Project with ID 00000000-0000-0000-0000-000000000999 not found",
  "error": "Not Found",
  "statusCode": 404
}
```

### Conflict (409) - Duplicate Name

```bash
# Create a project with duplicate name for the same tenant
curl -X POST "http://localhost:3000/api/v1/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "name": "Existing Project Name"
  }'
```

**Expected Response:**
```json
{
  "message": "Project with name \"Existing Project Name\" already exists for this tenant",
  "error": "Conflict",
  "statusCode": 409
}
```

---

## Testing Checklist

- [x] Create project with all fields
- [x] Create project without optional fields (code)
- [x] List projects with default pagination
- [x] List projects with custom page and limit
- [x] Filter by tenant_id
- [x] Filter by active status
- [x] Search by name (case-insensitive)
- [x] Sort by different fields (asc/desc)
- [x] Get single project by ID
- [x] Update project (partial update)
- [x] Delete project
- [x] Validate UUID format
- [x] Validate required fields
- [x] Handle 404 for non-existent project
- [x] Handle duplicate name constraint

---

## Quick Test Script

Run all tests at once:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"
TENANT_ID="00000000-0000-0000-0000-000000000001"

echo "1. Creating project..."
PROJECT_ID=$(curl -s -X POST "$BASE_URL/projects" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\":\"$TENANT_ID\",\"name\":\"Test Project\",\"code\":\"TEST-001\",\"active\":true}" \
  | jq -r '.id')

echo "Project ID: $PROJECT_ID"

echo -e "\n2. Listing projects..."
curl -s "$BASE_URL/projects?page=1&limit=5" | jq .

echo -e "\n3. Getting single project..."
curl -s "$BASE_URL/projects/$PROJECT_ID" | jq .

echo -e "\n4. Updating project..."
curl -s -X PATCH "$BASE_URL/projects/$PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}' | jq .

echo -e "\n5. Deleting project..."
curl -s -X DELETE "$BASE_URL/projects/$PROJECT_ID" -w "\nStatus: %{http_code}\n"

echo -e "\nDone!"
```

Save as `test-projects.sh`, make executable (`chmod +x test-projects.sh`), and run: `./test-projects.sh`
