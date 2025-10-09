# API Testing Guide - Tasks Module

This document provides example curl commands to test the Tasks CRUD endpoints.

## Prerequisites

1. Start the server: `pnpm dev`
2. Ensure you have at least one project created (see [API_TESTING.md](./API_TESTING.md))
3. Use test tenant ID: `00000000-0000-0000-0000-000000000001`

---

## Task Structure

Tasks support hierarchical organization with parent-child relationships:
- **Root tasks**: Tasks with `parent_task_id: null`
- **Child tasks**: Tasks with a valid `parent_task_id`
- **Circular reference protection**: System prevents creating circular parent-child loops

---

## Endpoints

### 1. Create Task

```bash
# Create a root task (no parent)
curl -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "project_id": "project-uuid-here",
    "name": "Backend Development"
  }'

# Create a child task (with parent)
curl -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "project_id": "project-uuid-here",
    "name": "Database Setup",
    "parent_task_id": "parent-task-uuid-here"
  }'
```

**Expected Response:**
```json
{
  "id": "uuid-here",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "projectId": "project-uuid-here",
  "name": "Backend Development",
  "parentTaskId": null
}
```

### 2. List Tasks (with Filtering)

```bash
# List all tasks with pagination
curl "http://localhost:3000/api/v1/tasks?page=1&limit=20"

# Filter by tenant
curl "http://localhost:3000/api/v1/tasks?tenant_id=00000000-0000-0000-0000-000000000001"

# Filter by project
curl "http://localhost:3000/api/v1/tasks?project_id=project-uuid-here"

# Get all root tasks (no parent)
curl "http://localhost:3000/api/v1/tasks?parent_task_id=null"

# Get children of a specific task
curl "http://localhost:3000/api/v1/tasks?parent_task_id=parent-task-uuid"

# Search by name
curl "http://localhost:3000/api/v1/tasks?search=Backend"

# Sort by name ascending
curl "http://localhost:3000/api/v1/tasks?sort=name:asc"

# Combine filters
curl "http://localhost:3000/api/v1/tasks?project_id=proj-uuid&parent_task_id=null&sort=name:asc"
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "uuid-here",
      "tenantId": "00000000-0000-0000-0000-000000000001",
      "projectId": "project-uuid-here",
      "name": "Task Name",
      "parentTaskId": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### 3. Get Single Task

```bash
curl "http://localhost:3000/api/v1/tasks/{task-id}"
```

**Expected Response:**
```json
{
  "id": "uuid-here",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "projectId": "project-uuid-here",
  "name": "Task Name",
  "parentTaskId": "parent-uuid-or-null"
}
```

### 4. Update Task

```bash
curl -X PATCH "http://localhost:3000/api/v1/tasks/{task-id}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Task Name",
    "parent_task_id": "new-parent-uuid"
  }'
```

**Note:** All fields are optional in PATCH requests.

**Expected Response:**
```json
{
  "id": "uuid-here",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "projectId": "project-uuid-here",
  "name": "Updated Task Name",
  "parentTaskId": "new-parent-uuid"
}
```

### 5. Delete Task

```bash
curl -X DELETE "http://localhost:3000/api/v1/tasks/{task-id}"
```

**Expected Response:** HTTP 204 No Content

**Important:** Cannot delete a task that has child tasks. Delete children first.

---

## Error Cases

### Validation Errors (400)

```bash
# Invalid UUID format
curl -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "invalid", "project_id": "also-invalid", "name": "Test"}'

# Empty name
curl -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "00000000-0000-0000-0000-000000000001", "project_id": "valid-uuid", "name": ""}'
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "error": "Validation failed",
  "message": "tenant_id: Invalid tenant_id format"
}
```

### Self-Referencing Parent (400)

```bash
# Task cannot be its own parent
curl -X PATCH "http://localhost:3000/api/v1/tasks/some-uuid" \
  -H "Content-Type: application/json" \
  -d '{"parent_task_id": "some-uuid"}'
```

**Expected Response:**
```json
{
  "message": "A task cannot be its own parent",
  "error": "Bad Request",
  "statusCode": 400
}
```

### Circular Reference (400)

```bash
# Attempting to create a circular hierarchy
# Example: Task A → Task B → Task A (would create a loop)
curl -X PATCH "http://localhost:3000/api/v1/tasks/task-a-uuid" \
  -H "Content-Type: application/json" \
  -d '{"parent_task_id": "task-b-uuid"}'
```

**Expected Response:**
```json
{
  "message": "Cannot set parent: this would create a circular reference in the task hierarchy",
  "error": "Bad Request",
  "statusCode": 400
}
```

### Delete Task with Children (400)

```bash
curl -X DELETE "http://localhost:3000/api/v1/tasks/parent-task-uuid"
```

**Expected Response:**
```json
{
  "message": "Cannot delete task with ID parent-task-uuid because it has 2 child task(s)",
  "error": "Bad Request",
  "statusCode": 400
}
```

### Not Found (404)

```bash
curl "http://localhost:3000/api/v1/tasks/00000000-0000-0000-0000-000000000999"
```

**Expected Response:**
```json
{
  "message": "Task with ID 00000000-0000-0000-0000-000000000999 not found",
  "error": "Not Found",
  "statusCode": 404
}
```

### Foreign Key Violations (400)

```bash
# Non-existent project
curl -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "project_id": "00000000-0000-0000-0000-999999999999",
    "name": "Test"
  }'
```

**Expected Response:**
```json
{
  "message": "Project with ID 00000000-0000-0000-0000-999999999999 not found",
  "error": "Bad Request",
  "statusCode": 400
}
```

### Conflict (409) - Duplicate Name

```bash
# Creating a task with duplicate name in same project
curl -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "project_id": "project-uuid",
    "name": "Existing Task Name"
  }'
```

**Expected Response:**
```json
{
  "message": "Task with name \"Existing Task Name\" already exists for this project",
  "error": "Conflict",
  "statusCode": 409
}
```

---

## Testing Checklist

- [x] Create root task (no parent)
- [x] Create child task (with parent)
- [x] Create nested hierarchy (grandchild tasks)
- [x] List tasks with default pagination
- [x] Filter by tenant_id
- [x] Filter by project_id
- [x] Filter by parent_task_id (including null for root tasks)
- [x] Search by name (case-insensitive)
- [x] Sort by different fields (asc/desc)
- [x] Get single task by ID
- [x] Update task name
- [x] Update task parent (move in hierarchy)
- [x] Delete child task (no children)
- [x] Validate UUID formats
- [x] Validate required fields
- [x] Handle 404 for non-existent task
- [x] Prevent self-referencing parent
- [x] Prevent circular reference chains
- [x] Prevent deleting parent with children
- [x] Handle duplicate name constraint
- [x] Handle foreign key violations (invalid project)

---

## Hierarchical Task Example

```bash
# Create project structure:
# - Backend Development (root)
#   - Database Setup (child)
#     - Schema Design (grandchild)
#     - Migrations (grandchild)
#   - API Development (child)
#     - REST Endpoints (grandchild)

TENANT="00000000-0000-0000-0000-000000000001"
PROJECT="project-uuid-here"

# 1. Create root task
BACKEND=$(curl -s -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\":\"$TENANT\",\"project_id\":\"$PROJECT\",\"name\":\"Backend Development\"}" \
  | jq -r '.id')

# 2. Create child tasks
DB=$(curl -s -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\":\"$TENANT\",\"project_id\":\"$PROJECT\",\"name\":\"Database Setup\",\"parent_task_id\":\"$BACKEND\"}" \
  | jq -r '.id')

API=$(curl -s -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\":\"$TENANT\",\"project_id\":\"$PROJECT\",\"name\":\"API Development\",\"parent_task_id\":\"$BACKEND\"}" \
  | jq -r '.id')

# 3. Create grandchild tasks
curl -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\":\"$TENANT\",\"project_id\":\"$PROJECT\",\"name\":\"Schema Design\",\"parent_task_id\":\"$DB\"}"

curl -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\":\"$TENANT\",\"project_id\":\"$PROJECT\",\"name\":\"REST Endpoints\",\"parent_task_id\":\"$API\"}"

# Query the hierarchy
echo "\n=== Root Tasks ==="
curl -s "http://localhost:3000/api/v1/tasks?parent_task_id=null" | jq '.data[] | {name: .name, id: .id}'

echo "\n=== Children of Backend Development ==="
curl -s "http://localhost:3000/api/v1/tasks?parent_task_id=$BACKEND" | jq '.data[] | {name: .name}'

echo "\n=== All tasks sorted by name ==="
curl -s "http://localhost:3000/api/v1/tasks?project_id=$PROJECT&sort=name:asc" | jq '.data[] | {name: .name, parent: .parentTaskId}'
```

---

## Key Features

1. **Hierarchical Organization**: Tasks can have unlimited nesting depth
2. **Circular Reference Prevention**: System validates parent-child relationships
3. **Safe Deletion**: Cannot delete parents with existing children
4. **Flexible Filtering**: Filter by project, parent, or get root tasks
5. **Type Safety**: Full UUID validation for all IDs
6. **Unique Names**: Task names must be unique per project (across all hierarchy levels)
