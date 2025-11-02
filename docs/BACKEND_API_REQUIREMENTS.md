# Backend API Requirements for Future Features

**Date**: January 2025
**Frontend Completion**: 90% (44/49 user stories)
**Purpose**: Document missing backend endpoints needed for remaining frontend features

---

## Executive Summary

The Kairos frontend is **90% complete** with existing backend APIs. This document outlines **optional** API enhancements that would enable the final 10% of features. None of these are blocking for production launch.

**Current Status**:
- ✅ All core features working (Auth, Timesheets, Leave, Dashboard, Reports)
- ✅ All admin tools functional (Users, Projects, Tasks, Holidays, etc.)
- ✅ All manager views complete (Calendar, Reports, Performance)

**What We Can Build Now** (No API changes):
1. ✅ User Deactivation (endpoint exists: `DELETE /users/:id`)
2. ✅ User Reactivation (endpoint implemented: `PUT /users/:id/reactivate`)
3. ✅ Workload Distribution Heatmap (uses existing calendar + employees endpoints)

**What Needs Business Decision** (API additions required):
1. Department/Team Management
2. Multi-Tenant Organization Switching
3. Manual Benefit Balance Adjustments
4. Activity Logging/Audit Trail
5. Advanced Reporting Features

---

## Priority Classification

### 🟢 **HIGH Priority** - Compliance & Security
Features needed for audit compliance and security requirements.

### 🟡 **MEDIUM Priority** - Power User Features
Nice-to-have features that enhance productivity for power users.

### 🔴 **LOW Priority** - Future Enhancements
Features that may be needed as the organization scales.

---

## 1. User Reactivation ✅

**Priority**: 🟢 HIGH
**Business Value**: User Management
**Status**: ✅ **IMPLEMENTED**
**Implementation Date**: January 2025

### User Story

**US-44: As an admin, I want to reactivate deactivated users so that they can regain access to the system.**

**Acceptance Criteria**:

- ✅ Reactivate a user who was previously deactivated
- ✅ User status changes from 'disabled' to 'active'
- ✅ User can log in and access system again
- ⚠️ Reactivation tracking in audit logs (pending audit trail feature)

### API Endpoint

```
PUT /api/v1/users/:id/reactivate

Path Parameters:
  - id: string (User UUID)

Response: 204 No Content

Error Responses:
  - 401: Invalid or expired session token
  - 403: Forbidden – requires admin or manager role (managers can only reactivate direct reports)
  - 404: User not found in tenant
  - 400: User is already active

Authorization:
  - Role: admin, manager
  - Admins can reactivate any user
  - Managers can only reactivate their direct reports
```

### Implementation Details

- ✅ Service method: `UsersService.reactivate()`
- ✅ Controller endpoint: `PUT /users/:id/reactivate`
- ✅ Authorization: Admin and manager roles with direct report check
- ✅ Validation: Checks user exists and status is 'disabled'
- ✅ Updates membership status from 'disabled' to 'active'
- ✅ Returns 204 No Content on success
- ✅ Full Swagger/OpenAPI documentation
- ⚠️ Email notification: Not yet implemented
- ⚠️ Audit logging: Pending audit trail feature

### Testing

Manual testing with existing seed data:

```bash
# Login as admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password123"}'

# Reactivate a disabled user
curl -X PUT http://localhost:3000/api/v1/users/{userId}/reactivate \
  -H "Authorization: Bearer {sessionToken}"
```

---

## 2. Activity Logging & Audit Trail

**Priority**: 🟢 HIGH
**Business Value**: Compliance, Security, Accountability
**Effort Estimate**: 2-3 weeks backend development
**Frontend Impact**: 3-4 hours to build audit log viewer

### User Stories

**US-46: As an admin, I want to see a history of all user management actions so that I can maintain accountability and comply with audit requirements.**

**Acceptance Criteria**:
- View log of all user creations, updates, deletions
- See who performed each action and when
- Filter logs by date range, user, action type
- Export audit logs to CSV for compliance reporting

**US-47: As an admin, I want to see change history for critical entities (projects, timesheets, leave requests) so that I can investigate issues and resolve disputes.**

**Acceptance Criteria**:
- View change history for any entity
- See before/after values for each change
- Track who made the change and when
- Filter by entity type and date range

### Missing API Endpoints

```
GET    /audit-logs
Query Parameters:
  - from: string (ISO date)
  - to: string (ISO date)
  - entityType: string (user|project|timesheet|leave-request|etc)
  - actionType: string (create|update|delete|approve|reject)
  - userId: string (actor who performed action)
  - page: number
  - pageSize: number

Response:
{
  "data": [
    {
      "id": "uuid",
      "timestamp": "2025-01-15T14:30:00Z",
      "entityType": "user",
      "entityId": "user-uuid",
      "actionType": "update",
      "actorUserId": "admin-uuid",
      "actorUserName": "John Admin",
      "changes": {
        "role": { "from": "employee", "to": "manager" },
        "status": { "from": "active", "to": "inactive" }
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 50,
    "totalCount": 1234,
    "totalPages": 25
  }
}

GET    /users/:id/activity
Query Parameters:
  - from: string (ISO date)
  - to: string (ISO date)
  - page: number
  - pageSize: number

Response: Similar to /audit-logs but filtered to specific user's actions

GET    /entities/:entityType/:entityId/history
Path Parameters:
  - entityType: string (user|project|timesheet|etc)
  - entityId: string (UUID)

Response:
{
  "entityType": "user",
  "entityId": "user-uuid",
  "history": [
    {
      "timestamp": "2025-01-15T14:30:00Z",
      "actionType": "update",
      "actorUserId": "admin-uuid",
      "actorUserName": "John Admin",
      "changes": { ... }
    }
  ]
}
```

### Implementation Notes
- Store audit logs in separate table for performance
- Include IP address and user agent for security
- Retention policy: Keep logs for 7 years (compliance)
- Consider log aggregation service (e.g., ELK stack)

---

## 3. Department/Team Management

**Priority**: 🔴 LOW
**Business Value**: Organizational Structure
**Effort Estimate**: 1-2 weeks backend development
**Frontend Impact**: 4-6 hours to build department management page

**Current Workaround**: Use manager hierarchy (already functional)

### User Stories

**US-48: As an admin, I want to create departments and assign employees to them so that I can organize the company structure.**

**Acceptance Criteria**:
- Create, edit, delete departments
- Assign department head (manager)
- Add/remove employees from departments
- View department hierarchy
- Generate reports by department

**US-49: As a manager, I want to see all employees in my department so that I can manage my team effectively.**

**Acceptance Criteria**:
- View department members list
- Filter employees by department
- See department statistics (headcount, avg utilization, etc.)

### Missing API Endpoints

```
GET    /departments
Query Parameters:
  - page: number
  - pageSize: number
  - search: string

Response:
{
  "data": [
    {
      "id": "dept-uuid",
      "name": "Engineering",
      "code": "ENG",
      "description": "Software engineering team",
      "headUserId": "manager-uuid",
      "headUserName": "Jane Manager",
      "memberCount": 25,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T12:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 50, "totalCount": 10 }
}

POST   /departments
Request Body:
{
  "name": "Engineering",
  "code": "ENG",
  "description": "Software engineering team",
  "headUserId": "manager-uuid"
}

Response: Department object

PUT    /departments/:id
Request Body: Same as POST

DELETE /departments/:id
Response: 204 No Content

GET    /departments/:id/members
Query Parameters:
  - page: number
  - pageSize: number

Response:
{
  "data": [ ...employee objects... ],
  "meta": { ... }
}

POST   /departments/:id/members
Request Body:
{
  "userId": "employee-uuid"
}

Response: 201 Created

DELETE /departments/:id/members/:userId
Response: 204 No Content
```

### Implementation Notes
- Users can belong to one department only
- Department hierarchy is flat (no sub-departments)
- Deleting a department should not delete users
- Manager hierarchy takes precedence over department structure

---

## 4. Multi-Tenant Organization Switching

**Priority**: 🔴 LOW
**Business Value**: Multi-Organization Support
**Effort Estimate**: 3-4 weeks backend development (major architecture change)
**Frontend Impact**: 2-3 hours for organization switcher UI

**Current Workaround**: Deploy separate instances per organization

### User Stories

**US-50: As a user with access to multiple organizations, I want to switch between them easily so that I can manage multiple companies.**

**Acceptance Criteria**:
- See list of organizations I have access to
- Switch to any organization with one click
- See current organization in navbar
- Maintain separate sessions per organization

### Missing API Endpoints

```
GET    /me/organizations
Response:
{
  "data": [
    {
      "id": "org-uuid-1",
      "name": "Acme Corp",
      "role": "admin",
      "logoUrl": "https://...",
      "isActive": true
    },
    {
      "id": "org-uuid-2",
      "name": "Widget Inc",
      "role": "employee",
      "logoUrl": "https://...",
      "isActive": false
    }
  ]
}

POST   /auth/switch-organization
Request Body:
{
  "organizationId": "org-uuid-2"
}

Response:
{
  "token": "new-jwt-token",
  "expiresIn": 3600,
  "organization": { ...org object... },
  "user": { ...user object with new org context... }
}

GET    /organizations/:id
Response: Detailed organization information
```

### Implementation Notes
- Requires tenant isolation at database level
- Need organization-scoped JWTs
- Consider using subdomains (org1.kairos.com, org2.kairos.com)
- Significant architectural change - not recommended for MVP

---

## 5. Manual Benefit Balance Adjustments

**Priority**: 🔴 LOW
**Business Value**: Manual Corrections
**Effort Estimate**: 1 week backend development
**Frontend Impact**: 2-3 hours for adjustment UI

**Current Workaround**: Balances auto-update via leave approvals (working as designed)

### User Stories

**US-51: As an admin, I want to manually adjust an employee's leave balance so that I can correct errors or grant additional days.**

**Acceptance Criteria**:
- Manually add/subtract leave days from any balance type
- Provide reason for adjustment (required)
- View adjustment history
- Export adjustment report

### Missing API Endpoints

```
POST   /users/:id/benefits/:benefitTypeId/adjust
Request Body:
{
  "adjustmentType": "add" | "subtract",
  "amount": 5.0,
  "unit": "days" | "hours",
  "reason": "Carry-over from previous year",
  "effectiveDate": "2025-01-01"
}

Response:
{
  "id": "adjustment-uuid",
  "userId": "user-uuid",
  "benefitTypeId": "vacation-uuid",
  "adjustmentType": "add",
  "amount": 5.0,
  "unit": "days",
  "reason": "Carry-over from previous year",
  "effectiveDate": "2025-01-01",
  "performedBy": "admin-uuid",
  "performedByName": "John Admin",
  "performedAt": "2025-01-15T14:30:00Z",
  "newBalance": 25.0
}

GET    /users/:id/benefits/:benefitTypeId/adjustments
Query Parameters:
  - from: string (ISO date)
  - to: string (ISO date)
  - page: number
  - pageSize: number

Response:
{
  "data": [ ...adjustment objects... ],
  "meta": { ... }
}
```

### Implementation Notes
- All adjustments must be auditable
- Cannot adjust balances retroactively if already consumed
- Consider approval workflow for large adjustments
- Integration with payroll system may be needed

---

## 6. Advanced Reporting Features

**Priority**: 🟡 MEDIUM
**Business Value**: Power User Analytics
**Effort Estimate**: 2 weeks backend development
**Frontend Impact**: Already built (3-4 hours for enhancements)

**Current Workaround**: Basic reports with CSV export (working)

### User Stories

**US-52: As a manager, I want to schedule recurring reports so that I receive them automatically via email.**

**Acceptance Criteria**:
- Schedule weekly/monthly reports
- Choose report type and filters
- Receive report via email (PDF/CSV attachment)
- Manage scheduled reports (edit, delete, pause)

**US-53: As an admin, I want to create custom report templates so that I can generate specialized reports for different audiences.**

**Acceptance Criteria**:
- Define custom report fields
- Save report templates
- Share templates with other admins
- Generate report from template

### Missing API Endpoints

```
POST   /reports/schedule
Request Body:
{
  "reportType": "timesheet" | "leave" | "performance",
  "frequency": "daily" | "weekly" | "monthly",
  "dayOfWeek": 1-7 (for weekly),
  "dayOfMonth": 1-31 (for monthly),
  "time": "09:00",
  "timezone": "America/New_York",
  "filters": {
    "from": "2025-01-01",
    "to": "2025-01-31",
    "userIds": ["uuid1", "uuid2"],
    "projectIds": ["uuid3"]
  },
  "format": "csv" | "pdf",
  "recipients": ["email1@example.com", "email2@example.com"]
}

Response: Scheduled report object with ID

GET    /reports/schedules
Response: List of all scheduled reports for user

PUT    /reports/schedules/:id
Request Body: Same as POST

DELETE /reports/schedules/:id
Response: 204 No Content

POST   /reports/templates
Request Body:
{
  "name": "Monthly Manager Summary",
  "description": "Overview of team performance",
  "reportType": "timesheet",
  "fields": ["totalHours", "utilization", "projectBreakdown"],
  "filters": { ... },
  "isPublic": true
}

Response: Report template object

GET    /reports/templates
Response: List of available templates

POST   /reports/generate
Request Body:
{
  "templateId": "template-uuid",
  "filters": { ... },
  "format": "csv" | "pdf"
}

Response:
{
  "jobId": "job-uuid",
  "status": "pending" | "processing" | "completed" | "failed",
  "downloadUrl": "https://..." (when completed)
}

GET    /reports/jobs/:jobId
Response: Job status and download URL
```

### Implementation Notes
- Use background job queue for report generation
- Store generated reports for 30 days
- Rate limit report generation to prevent abuse
- Consider using dedicated reporting service

---

## Implementation Priority for Business

### Phase 1: Launch MVP (Current State)
**Status**: ✅ READY NOW
**Completion**: 90% (44/49 user stories)

**What Works**:
- Complete user management (create, edit, deactivate)
- Full timesheet workflows
- Leave request management
- Manager dashboards and reports
- Calendar and availability tracking

**What to Build Before Launch** (1-2 days):
1. User reactivation UI (deactivate already works)
2. Workload distribution heatmap

**Result**: 94% complete, production-ready

---

### Phase 2: Post-Launch Enhancements (Q1 2025)
**Priority**: 🟢 HIGH

1. **Activity Logging & Audit Trail** (2-3 weeks)
   - Compliance requirement
   - Security requirement
   - Needed for enterprise customers

---

### Phase 3: Power User Features (Q2 2025)
**Priority**: 🟡 MEDIUM

1. **Advanced Reporting** (2 weeks)
   - Scheduled reports
   - Custom templates
   - PDF export

---

### Phase 4: Scale Features (Q3-Q4 2025)
**Priority**: 🔴 LOW

1. **Department Management** (1-2 weeks)
   - Only if manager hierarchy insufficient

2. **Manual Benefit Adjustments** (1 week)
   - Only if auto-calculations have issues

3. **Multi-Tenant Support** (3-4 weeks)
   - Only if serving multiple organizations
   - Major architectural change

---

## API Design Principles

All new endpoints should follow these principles:

1. **RESTful Design**: Use standard HTTP methods (GET, POST, PUT, DELETE)
2. **Consistent Responses**: All list endpoints return `{ data: [], meta: {} }`
3. **Pagination**: Support `page` and `pageSize` query parameters
4. **Filtering**: Support common filters (date ranges, status, search)
5. **Error Handling**: Return meaningful error messages with HTTP status codes
6. **Authentication**: All endpoints require valid JWT token
7. **Rate Limiting**: Implement rate limiting to prevent abuse
8. **Versioning**: Use API versioning (e.g., `/api/v1/...`)

---

## Testing Requirements

For each new endpoint, provide:

1. **Postman Collection**: With example requests/responses
2. **API Documentation**: OpenAPI/Swagger spec
3. **Unit Tests**: Backend unit tests
4. **Integration Tests**: End-to-end API tests
5. **Performance Tests**: Load testing for report generation

---

## Questions for Business Team

Before implementing these features, please clarify:

1. **Audit Logging**:
   - How long should we retain audit logs? (7 years is standard for compliance)
   - What level of detail is needed?
   - Should we integrate with external SIEM system?

2. **Department Management**:
   - Is manager hierarchy sufficient, or do we need formal departments?
   - How many levels of department hierarchy?
   - Can users belong to multiple departments?

3. **Multi-Tenant**:
   - Will we serve multiple organizations?
   - Should organizations be completely isolated?
   - Subdomain vs single domain approach?

4. **Benefit Adjustments**:
   - Should manual adjustments require approval?
   - Are there limits on adjustment amounts?
   - Integration with payroll system needed?

5. **Advanced Reporting**:
   - Email delivery service available?
   - PDF generation library available?
   - Storage limits for generated reports?

---

## Summary for Backend Team

**Immediate Action**: None! Frontend is 90% complete with existing APIs.

**Optional Additions** (by priority):
1. 🟢 HIGH: Activity logging/audit trail (compliance)
2. 🟡 MEDIUM: Advanced reporting (power users)
3. 🔴 LOW: Department management (organizational structure)
4. 🔴 LOW: Multi-tenant support (scale feature)
5. 🔴 LOW: Manual balance adjustments (corrections)

**Recommendation**: Launch MVP now, gather user feedback, then prioritize Phase 2 features based on actual usage patterns.

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Contact**: Frontend Team
