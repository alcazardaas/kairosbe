# Swagger Quick Start Guide

## 🚀 Quick Start (3 Steps)

### 1. Start the Application
```bash
pnpm dev
```

### 2. Open Swagger UI
```
http://localhost:3000/docs
```

### 3. Authenticate
1. Click "Authorize" button (top right)
2. Login first via `POST /api/v1/auth/login` to get a session token
3. Paste your session token
4. Click "Authorize"

---

## 📖 Common Operations

### Get a Session Token
```bash
POST /api/v1/auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "data": {
    "sessionToken": "copy-this-token",
    "refreshToken": "...",
    ...
  }
}
```

### Test an Endpoint
1. Expand endpoint section (e.g., "Projects")
2. Click on specific endpoint (e.g., `GET /api/v1/projects`)
3. Click "Try it out"
4. Fill in parameters if needed
5. Click "Execute"
6. View response below

### Export OpenAPI Spec
```bash
# Terminal 1: Start app
pnpm dev

# Terminal 2: Export spec
pnpm export:openapi
```
Result: `openapi.json` file created

---

## 🔍 Finding What You Need

| I want to... | Go to... |
|--------------|----------|
| Login and get a token | Authentication → `POST /auth/login` |
| See my user info | Authentication → `GET /auth/me` |
| List all projects | Projects → `GET /projects` |
| Create a timesheet | Timesheets → `POST /timesheets` |
| Request time off | Leave Requests → `POST /leave-requests` |
| Search for a project | Search → `GET /search/projects` |
| View calendar | Calendar → `GET /calendar` |
| Check API health | Health → `GET /health` |

---

## ⚠️ Common Issues

### "401 Unauthorized"
- You need to authenticate first
- Click "Authorize" button
- Get session token from `/auth/login`
- Paste token and click "Authorize"

### "Swagger UI not loading"
- Make sure app is running (`pnpm dev`)
- Check URL: `http://localhost:3000/docs` (not `/api/v1/docs`)
- Clear browser cache

### "Export script fails"
- App must be running before export
- Check that app is on port 3000
- Verify `/docs-json` endpoint is accessible

---

## 📋 Response Format Cheat Sheet

**Single Item:**
```json
{
  "data": { /* item */ }
}
```

**List (with pagination):**
```json
{
  "data": [ /* items */ ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

**Error:**
```json
{
  "error": "Bad Request",
  "message": "Details here",
  "statusCode": 400
}
```

---

## 🎯 Example Workflow

### 1. Login
```
POST /api/v1/auth/login
Body: { email, password }
→ Copy sessionToken
```

### 2. Authorize in Swagger
```
Click "Authorize" → Paste token → Click "Authorize"
```

### 3. Get Current User Info
```
GET /api/v1/auth/me
→ See user, tenant, role, permissions
```

### 4. List Projects
```
GET /api/v1/projects?page=1&limit=10
→ See all projects
```

### 5. Create Time Entry
```
POST /api/v1/time-entries
Body: { user_id, project_id, task_id, date, hours, ... }
→ Time logged
```

### 6. Create Timesheet
```
POST /api/v1/timesheets
Body: { user_id, week_start_date, entries: [...] }
→ Timesheet created
```

### 7. Submit for Approval
```
POST /api/v1/timesheets/{id}/submit
→ Timesheet submitted
```

---

## 🛠️ Tips & Tricks

### Pagination
```
?page=2&limit=50
```

### Sorting
```
?sort=created_at:desc
```

### Filtering
```
?status=pending&from=2025-01-01&to=2025-12-31
```

### Combine Filters
```
?status=pending&page=1&limit=20&sort=created_at:desc
```

### Search
```
GET /search/projects?q=marketing
GET /search/tasks?q=design&project_id=123
```

---

## 📚 More Info

- Detailed guide: [SWAGGER_README.md](SWAGGER_README.md)
- Implementation details: [SWAGGER_IMPLEMENTATION_SUMMARY.md](SWAGGER_IMPLEMENTATION_SUMMARY.md)
- Project docs: [CLAUDE.md](CLAUDE.md)

---

**That's it! You're ready to use the Kairos API** 🎉
