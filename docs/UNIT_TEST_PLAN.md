# Unit Test Plan - Kairos Backend

**Project:** Kairos Backend API
**Framework:** NestJS + TypeScript + Vitest
**Target Coverage:** 95% minimum, 100% goal
**Status:** Planning & Implementation Phase
**Last Updated:** 2025-11-12

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Testing Philosophy](#testing-philosophy)
3. [Technology Stack](#technology-stack)
4. [Testing Standards](#testing-standards)
5. [Test Patterns](#test-patterns)
6. [Module Coverage Plan](#module-coverage-plan)
7. [Coverage Strategy](#coverage-strategy)
8. [Implementation Roadmap](#implementation-roadmap)
9. [CI/CD Integration](#cicd-integration)
10. [Best Practices](#best-practices)

---

## Executive Summary

### Current State
- **Test Framework:** Vitest configured and ready
- **Existing Tests:** 1 spec file (audit.service.spec.ts)
- **Current Coverage:** ~6% (1/17 services)
- **Total Modules:** 14 feature modules
- **Total Services:** 17 services
- **Total Controllers:** 15 controllers

### Goals
- **Phase 1:** Achieve 60% coverage (critical paths)
- **Phase 2:** Achieve 80% coverage (full service layer)
- **Phase 3:** Achieve 95% coverage (controllers + edge cases)
- **Phase 4:** Achieve 100% coverage (complete)

### Timeline
- **Phase 1:** 2-3 weeks (critical modules)
- **Phase 2:** 3-4 weeks (all services)
- **Phase 3:** 2-3 weeks (controllers + integration)
- **Phase 4:** 1-2 weeks (edge cases + 100%)

---

## Testing Philosophy

### Core Principles

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Test public API contracts
   - Avoid testing private methods directly

2. **Isolation & Independence**
   - Each test should run independently
   - No shared state between tests
   - Use mocks for external dependencies

3. **Clarity & Maintainability**
   - Descriptive test names (what/when/expected)
   - Arrange-Act-Assert pattern
   - One assertion per test (when possible)

4. **Fast & Reliable**
   - No actual database connections
   - No network calls
   - Mock external services
   - Tests should run in <5 seconds

5. **Coverage as a Guide**
   - 95% minimum coverage
   - 100% of critical business logic
   - Focus on value, not just metrics

### What to Test

✅ **Always Test:**
- Business logic in services
- Validation logic (DTOs, pipes)
- Authorization checks (guards)
- Data transformations (camelCase ↔ snake_case)
- Error handling and edge cases
- State changes and side effects

❌ **Don't Test:**
- Third-party library internals
- Framework code (NestJS, Drizzle)
- Trivial getters/setters
- Auto-generated code

---

## Technology Stack

### Testing Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **vitest** | ^2.1.5 | Test runner (Jest-compatible, faster) |
| **@nestjs/testing** | ^10.4.4 | NestJS testing utilities |
| **supertest** | ^7.0.0 | HTTP endpoint testing |
| **@types/supertest** | ^6.0.2 | TypeScript types |

### Why Vitest?

- **Speed:** 10x faster than Jest for our use case
- **ESM Native:** Better TypeScript/ES module support
- **Vite Powered:** Instant HMR for test files
- **Jest Compatible:** Same API, easy migration
- **Better DX:** Faster feedback loop

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,              // No need to import describe/it/expect
    environment: 'node',        // Node.js environment
    coverage: {
      provider: 'v8',           // V8 coverage (faster than Istanbul)
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.spec.ts',
        '**/*.test.ts',
        'src/main.ts',          // Bootstrap file
        'src/db/migrate.ts',    // Migration scripts
        'src/db/seed-*.ts',     // Seed scripts
      ],
      thresholds: {
        lines: 95,              // 95% line coverage
        functions: 95,          // 95% function coverage
        branches: 90,           // 90% branch coverage
        statements: 95,         // 95% statement coverage
      },
    },
    setupFiles: ['./test/setup.ts'],  // Global test setup
  },
});
```

---

## Testing Standards

### File Naming & Location

```
src/
  module/
    module.controller.ts
    module.controller.spec.ts      ✅ Controller tests
    module.service.ts
    module.service.spec.ts         ✅ Service tests
    dto/
      create-module.dto.ts
      create-module.dto.spec.ts    ✅ DTO validation tests
    guards/
      module.guard.ts
      module.guard.spec.ts         ✅ Guard tests
```

**Conventions:**
- Test files live next to source files
- Use `.spec.ts` extension
- Mirror source file name exactly

### Test Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceName } from './service-name.service';
import { DependencyService } from '../dependency/dependency.service';

describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: jest.Mocked<DependencyService>;

  beforeEach(async () => {
    // Arrange: Set up test module
    mockDependency = {
      method: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        { provide: DependencyService, useValue: mockDependency },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('methodName', () => {
    it('should return expected result when given valid input', async () => {
      // Arrange
      const input = { /* test data */ };
      const expected = { /* expected result */ };
      mockDependency.method.mockResolvedValue(expected);

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(expected);
      expect(mockDependency.method).toHaveBeenCalledWith(input);
      expect(mockDependency.method).toHaveBeenCalledTimes(1);
    });

    it('should throw error when input is invalid', async () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      await expect(service.methodName(invalidInput)).rejects.toThrow(
        'Expected error message',
      );
    });
  });
});
```

### Naming Conventions

```typescript
// ✅ Good: Descriptive, behavior-focused
describe('TimesheetService', () => {
  describe('submit', () => {
    it('should submit timesheet when status is draft', () => {});
    it('should throw error when timesheet is already submitted', () => {});
    it('should validate hours before submission', () => {});
  });
});

// ❌ Bad: Implementation-focused, unclear
describe('TimesheetService', () => {
  it('test1', () => {});
  it('should call database', () => {});
});
```

**Pattern:** `should [expected behavior] when [condition]`

---

## Test Patterns

### Pattern 1: Service with Database (Drizzle)

```typescript
import { Test } from '@nestjs/testing';
import { TimeEntryService } from './time-entry.service';
import { DbService } from '../db/db.service';

describe('TimeEntryService', () => {
  let service: TimeEntryService;
  let mockDrizzle: any;

  beforeEach(async () => {
    // Mock Drizzle query builder
    mockDrizzle = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue([{ id: '123' }]),
      returning: jest.fn().mockResolvedValue([{ id: '123' }]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TimeEntryService,
        {
          provide: DbService,
          useValue: { drizzle: mockDrizzle },
        },
      ],
    }).compile();

    service = module.get(TimeEntryService);
  });

  it('should create time entry with transformed data', async () => {
    const dto = { userId: 'user-1', projectId: 'proj-1', hours: 8 };

    await service.create('tenant-1', dto);

    expect(mockDrizzle.insert).toHaveBeenCalled();
    expect(mockDrizzle.values).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',        // snake_case in DB
        project_id: 'proj-1',
        hours: 8,
        tenant_id: 'tenant-1',
      }),
    );
  });
});
```

### Pattern 2: Controller Testing

```typescript
import { Test } from '@nestjs/testing';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './timesheets.service';

describe('TimesheetsController', () => {
  let controller: TimesheetsController;
  let mockService: jest.Mocked<TimesheetsService>;

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      submit: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      controllers: [TimesheetsController],
      providers: [
        { provide: TimesheetsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get(TimesheetsController);
  });

  describe('findAll', () => {
    it('should return paginated timesheets', async () => {
      const tenantId = 'tenant-1';
      const query = { page: 1, limit: 20 };
      const expected = { data: [], meta: { page: 1, limit: 20, total: 0 } };

      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(tenantId, query);

      expect(result).toEqual(expected);
      expect(mockService.findAll).toHaveBeenCalledWith(tenantId, query);
    });
  });
});
```

### Pattern 3: Guard Testing (Authorization)

```typescript
import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AdminGuard],
    }).compile();

    guard = module.get(AdminGuard);
  });

  it('should allow access when user is admin', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: 'admin' },
        }),
      }),
    } as ExecutionContext;

    const result = guard.canActivate(mockContext);

    expect(result).toBe(true);
  });

  it('should deny access when user is not admin', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: 'employee' },
        }),
      }),
    } as ExecutionContext;

    const result = guard.canActivate(mockContext);

    expect(result).toBe(false);
  });
});
```

### Pattern 4: DTO Validation Testing

```typescript
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createTimeEntrySchema } from './dto/create-time-entry.dto';

describe('CreateTimeEntryDto Validation', () => {
  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(createTimeEntrySchema);
  });

  it('should accept valid time entry data', () => {
    const validData = {
      userId: 'user-123',
      projectId: 'proj-456',
      taskId: 'task-789',
      weekStartDate: '2025-01-06',
      dayOfWeek: 1,
      hours: 8,
      note: 'Development work',
    };

    const result = pipe.transform(validData, { type: 'body' });

    expect(result).toEqual(validData);
  });

  it('should reject when hours exceed 24', () => {
    const invalidData = {
      userId: 'user-123',
      projectId: 'proj-456',
      weekStartDate: '2025-01-06',
      dayOfWeek: 1,
      hours: 25,
    };

    expect(() => pipe.transform(invalidData, { type: 'body' })).toThrow();
  });

  it('should reject when dayOfWeek is out of range', () => {
    const invalidData = {
      userId: 'user-123',
      projectId: 'proj-456',
      weekStartDate: '2025-01-06',
      dayOfWeek: 7,  // Should be 0-6
      hours: 8,
    };

    expect(() => pipe.transform(invalidData, { type: 'body' })).toThrow();
  });
});
```

### Pattern 5: Transformation Helper Testing

```typescript
import {
  transformKeysToCamel,
  transformKeysToSnake,
} from './case-transform.helper';

describe('Case Transformation Helpers', () => {
  describe('transformKeysToCamel', () => {
    it('should transform snake_case to camelCase', () => {
      const input = {
        user_id: 'user-1',
        project_id: 'proj-1',
        week_start_date: '2025-01-06',
        created_at: '2025-01-01T00:00:00Z',
      };

      const result = transformKeysToCamel(input);

      expect(result).toEqual({
        userId: 'user-1',
        projectId: 'proj-1',
        weekStartDate: '2025-01-06',
        createdAt: '2025-01-01T00:00:00Z',
      });
    });

    it('should handle nested objects', () => {
      const input = {
        user_id: 'user-1',
        time_entries: [
          { entry_id: '1', hours_logged: 8 },
          { entry_id: '2', hours_logged: 6 },
        ],
      };

      const result = transformKeysToCamel(input);

      expect(result.timeEntries[0]).toEqual({
        entryId: '1',
        hoursLogged: 8,
      });
    });

    it('should handle arrays of objects', () => {
      const input = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
      ];

      const result = transformKeysToCamel(input);

      expect(result).toEqual([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
    });
  });
});
```

### Pattern 6: Error Handling Testing

```typescript
describe('TimesheetService - Error Handling', () => {
  it('should throw NotFoundException when timesheet not found', async () => {
    mockDrizzle.select().from().where.mockResolvedValue([]);

    await expect(
      service.findOne('tenant-1', 'nonexistent-id')
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when user lacks permission', async () => {
    mockDrizzle.select().from().where.mockResolvedValue([
      { id: 'ts-1', user_id: 'other-user' },
    ]);

    await expect(
      service.approve('tenant-1', 'ts-1', { userId: 'manager-1', role: 'employee' })
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException when validation fails', async () => {
    const invalidDto = { hours: 25 };  // Exceeds max

    await expect(
      service.create('tenant-1', invalidDto)
    ).rejects.toThrow(BadRequestException);
  });
});
```

---

## Module Coverage Plan

### Priority Levels

- **P0 (Critical):** Core business logic, authentication, data integrity
- **P1 (High):** User-facing features, common workflows
- **P2 (Medium):** Admin features, configuration
- **P3 (Low):** Utility functions, helpers

### Module-by-Module Plan

#### 1. Auth Module (P0 - Critical)

**Files to Test:**
- `auth.service.spec.ts`
- `auth.controller.spec.ts`
- `session.guard.spec.ts`
- `roles.guard.spec.ts`

**Test Cases:**
```
AuthService:
  login()
    ✓ should return session token when credentials are valid
    ✓ should throw UnauthorizedException when email not found
    ✓ should throw UnauthorizedException when password is incorrect
    ✓ should create session in database
    ✓ should set session expiry based on SESSION_TTL
    ✓ should handle multiple tenant memberships
    ✓ should use first active membership when tenant not specified

  logout()
    ✓ should invalidate session in database
    ✓ should handle invalid session token gracefully

  refresh()
    ✓ should generate new session token
    ✓ should rotate refresh token
    ✓ should throw error when refresh token expired

  validateSession()
    ✓ should return user + tenant when session valid
    ✓ should return null when session expired
    ✓ should return null when session not found

SessionGuard:
  canActivate()
    ✓ should allow request when session valid
    ✓ should deny request when session invalid
    ✓ should deny request when session expired
    ✓ should attach user and tenantId to request

RolesGuard:
  canActivate()
    ✓ should allow admin access to admin routes
    ✓ should deny employee access to admin routes
    ✓ should allow manager access to manager routes
```

**Coverage Goal:** 100% (authentication is critical)

---

#### 2. Timesheets Module (P0 - Critical)

**Files to Test:**
- `timesheets.service.spec.ts`
- `timesheets.controller.spec.ts`

**Test Cases:**
```
TimesheetsService:
  findAll()
    ✓ should return paginated timesheets for user
    ✓ should filter by status
    ✓ should filter by date range
    ✓ should return team timesheets for manager
    ✓ should apply tenant isolation

  findOne()
    ✓ should return timesheet with time entries
    ✓ should throw NotFoundException when not found
    ✓ should transform keys to camelCase

  create()
    ✓ should create draft timesheet
    ✓ should set initial status to draft
    ✓ should validate user belongs to tenant

  submit()
    ✓ should submit draft timesheet
    ✓ should throw error when already submitted
    ✓ should throw error when no time entries
    ✓ should validate against timesheet policy
    ✓ should check required hours per week

  approve()
    ✓ should approve submitted timesheet
    ✓ should throw error when user is not manager
    ✓ should throw error when timesheet not submitted
    ✓ should update status to approved

  reject()
    ✓ should reject submitted timesheet
    ✓ should require rejection reason
    ✓ should change status back to draft

  recall()
    ✓ should recall submitted timesheet by owner
    ✓ should throw error when already approved

  validate()
    ✓ should validate total hours against policy
    ✓ should check for overlapping entries
    ✓ should validate project access
```

**Coverage Goal:** 100%

---

#### 3. Time Entries Module (P0 - Critical)

**Files to Test:**
- `time-entries.service.spec.ts`
- `time-entries.controller.spec.ts`
- `dto/create-time-entry.dto.spec.ts`
- `dto/bulk-time-entry.dto.spec.ts`

**Test Cases:**
```
TimeEntriesService:
  create()
    ✓ should create time entry with valid data
    ✓ should transform camelCase to snake_case
    ✓ should validate hours (0-24)
    ✓ should validate dayOfWeek (0-6)
    ✓ should check user has access to project
    ✓ should check timesheet is in draft status

  bulkUpsert()
    ✓ should create multiple entries in transaction
    ✓ should update existing entries
    ✓ should rollback on error
    ✓ should validate all entries before insert

  findWeekView()
    ✓ should return 7-day grid with totals
    ✓ should group by project and task
    ✓ should calculate daily totals
    ✓ should calculate weekly total

  copyWeek()
    ✓ should copy previous week entries
    ✓ should adjust dates to new week
    ✓ should skip if target week has entries

  update()
    ✓ should update hours and note only
    ✓ should throw error when timesheet locked
    ✓ should prevent changing userId/projectId

  delete()
    ✓ should delete entry when timesheet draft
    ✓ should throw error when timesheet locked
```

**Coverage Goal:** 100%

---

#### 4. Projects Module (P1 - High)

**Files to Test:**
- `projects.service.spec.ts`
- `projects.controller.spec.ts`

**Test Cases:**
```
ProjectsService:
  findAll()
    ✓ should return all projects for tenant
    ✓ should filter by status (active/archived)
    ✓ should paginate results

  findOne()
    ✓ should return project with members
    ✓ should throw NotFoundException when not found

  create()
    ✓ should create project with valid data
    ✓ should require unique project code per tenant
    ✓ should set created_by to current user

  update()
    ✓ should update project details
    ✓ should prevent duplicate project codes

  addMember()
    ✓ should add user to project
    ✓ should prevent duplicate memberships
    ✓ should validate user exists in tenant

  removeMember()
    ✓ should remove user from project
    ✓ should check for existing time entries
```

**Coverage Goal:** 95%

---

#### 5. Tasks Module (P1 - High)

**Files to Test:**
- `tasks.service.spec.ts`
- `tasks.controller.spec.ts`

**Test Cases:**
```
TasksService:
  findAll()
    ✓ should return tasks for project
    ✓ should return hierarchical structure
    ✓ should filter by parent task

  create()
    ✓ should create task under project
    ✓ should create subtask under parent
    ✓ should validate parent task exists

  update()
    ✓ should update task details
    ✓ should prevent circular parent references
```

**Coverage Goal:** 95%

---

#### 6. Leave Requests Module (P1 - High)

**Files to Test:**
- `leave-requests.service.spec.ts`
- `leave-requests.controller.spec.ts`

**Test Cases:**
```
LeaveRequestsService:
  create()
    ✓ should create leave request
    ✓ should validate benefit balance
    ✓ should check for overlapping requests
    ✓ should calculate days correctly

  approve()
    ✓ should approve request and deduct balance
    ✓ should require manager permission
    ✓ should update request status

  reject()
    ✓ should reject request without deducting balance
    ✓ should require rejection reason

  getUserBenefits()
    ✓ should return all benefit types with balances
    ✓ should calculate used/remaining correctly
```

**Coverage Goal:** 95%

---

#### 7. Users Module (P2 - Medium)

**Files to Test:**
- `users.service.spec.ts`
- `users.controller.spec.ts`
- `services/user-import.service.spec.ts` ✅ (TODO)

**Test Cases:**
```
UsersService:
  findAll()
    ✓ should return users in tenant
    ✓ should filter by role
    ✓ should filter by status (active/inactive)

  create()
    ✓ should create user with hashed password
    ✓ should create membership in tenant
    ✓ should send invitation email (if configured)

  update()
    ✓ should update user profile
    ✓ should prevent email duplicates

  deactivate()
    ✓ should deactivate user
    ✓ should invalidate all sessions

UserImportService:
  parseFile()
    ✓ should parse CSV file
    ✓ should parse Excel file
    ✓ should handle BOM
    ✓ should normalize headers

  validateRows()
    ✓ should validate all fields
    ✓ should collect errors per row
    ✓ should check duplicate emails

  importUsers()
    ✓ should create new users
    ✓ should add existing users to tenant
    ✓ should handle transaction rollback
    ✓ should log audit entry
```

**Coverage Goal:** 95%

---

#### 8. Organization Module (P2 - Medium)

**Files to Test:**
- `organization.service.spec.ts`
- `organization.controller.spec.ts`

**Test Cases:**
```
OrganizationService:
  getSettings()
    ✓ should return tenant organization settings

  updateSettings()
    ✓ should update organization settings
    ✓ should validate timezone
    ✓ should validate week start day (0-6)
```

**Coverage Goal:** 95%

---

#### 9. Calendar Module (P1 - High)

**Files to Test:**
- `calendar.service.spec.ts`
- `calendar.controller.spec.ts`

**Test Cases:**
```
CalendarService:
  getCalendarFeed()
    ✓ should return holidays, leave, timesheets
    ✓ should filter by date range
    ✓ should filter by user
    ✓ should include/exclude based on query params
```

**Coverage Goal:** 95%

---

#### 10. Holidays Module (P2 - Medium)

**Files to Test:**
- `holidays.service.spec.ts`
- `holidays.controller.spec.ts`

**Test Cases:**
```
HolidaysService:
  findAll()
    ✓ should return holidays for tenant
    ✓ should filter by year
    ✓ should filter by country code

  create()
    ✓ should create holiday
    ✓ should handle recurring holidays
```

**Coverage Goal:** 90%

---

#### 11. Benefit Types Module (P2 - Medium)

**Files to Test:**
- `benefit-types.service.spec.ts`
- `benefit-types.controller.spec.ts`

**Test Cases:**
```
BenefitTypesService:
  findAll()
    ✓ should return benefit types for tenant

  create()
    ✓ should create benefit type
    ✓ should set default allowances
```

**Coverage Goal:** 90%

---

#### 12. Timesheet Policies Module (P2 - Medium)

**Files to Test:**
- `timesheet-policies.service.spec.ts`
- `timesheet-policies.controller.spec.ts`

**Test Cases:**
```
TimesheetPoliciesService:
  getPolicy()
    ✓ should return policy for tenant

  updatePolicy()
    ✓ should update policy settings
    ✓ should validate hours per week
```

**Coverage Goal:** 90%

---

#### 13. Search Module (P3 - Low)

**Files to Test:**
- `search.service.spec.ts`
- `search.controller.spec.ts`

**Test Cases:**
```
SearchService:
  searchProjects()
    ✓ should search by name
    ✓ should search by code
    ✓ should limit results

  searchTasks()
    ✓ should search by name
    ✓ should filter by project
```

**Coverage Goal:** 85%

---

#### 14. Common Module (P1 - High)

**Files to Test:**
- `audit/audit.service.spec.ts` ✅ (Already exists)
- `helpers/case-transform.helper.spec.ts`
- `pipes/zod-validation.pipe.spec.ts`
- `guards/admin.guard.spec.ts`
- `guards/manager.guard.spec.ts`

**Test Cases:**
```
CaseTransformHelper:
  transformKeysToCamel()
    ✓ should transform snake_case keys
    ✓ should handle nested objects
    ✓ should handle arrays
    ✓ should preserve null/undefined

  transformKeysToSnake()
    ✓ should transform camelCase keys
    ✓ should handle nested objects
    ✓ should handle arrays

ZodValidationPipe:
  transform()
    ✓ should validate and return valid data
    ✓ should throw BadRequestException on invalid data
    ✓ should include detailed error messages
```

**Coverage Goal:** 95%

---

#### 15. Health Module (P3 - Low)

**Files to Test:**
- `health.controller.spec.ts`

**Test Cases:**
```
HealthController:
  check()
    ✓ should return OK when database connected
    ✓ should return error when database disconnected
```

**Coverage Goal:** 85%

---

## Coverage Strategy

### Coverage Thresholds

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    lines: 95,        // 95% of lines executed
    functions: 95,    // 95% of functions called
    branches: 90,     // 90% of branches taken
    statements: 95,   // 95% of statements executed
  },
  // Per-file thresholds (optional)
  perFile: true,
}
```

### Measuring Coverage

```bash
# Run tests with coverage
pnpm test:cov

# Generate HTML report
pnpm test:cov
# Opens in browser: coverage/index.html

# Check specific file
pnpm test:cov src/timesheets/timesheets.service.spec.ts
```

### Coverage Reports

**Generated files:**
- `coverage/index.html` - Interactive HTML report
- `coverage/coverage-final.json` - Raw coverage data
- `coverage/lcov.info` - LCOV format (for CI tools)

**Report includes:**
- Overall coverage percentages
- Per-file coverage breakdown
- Uncovered lines highlighted
- Branch coverage visualization

### Improving Coverage

**When coverage is low:**

1. **Identify gaps:**
   ```bash
   pnpm test:cov
   # Open coverage/index.html
   # Click on file to see uncovered lines
   ```

2. **Add missing test cases:**
   - Error paths
   - Edge cases
   - Conditional branches

3. **Avoid coverage inflation:**
   - Don't test trivial code
   - Don't test framework internals
   - Exclude generated code

4. **Focus on value:**
   - 100% coverage ≠ perfect tests
   - Test behavior, not implementation
   - Prioritize critical paths

---

## Implementation Roadmap

### Phase 1: Critical Modules (2-3 weeks)
**Target: 60% overall coverage**

**Week 1:**
- [x] Set up test utilities and helpers
- [ ] Auth module (100% coverage)
  - [ ] auth.service.spec.ts
  - [ ] auth.controller.spec.ts
  - [ ] session.guard.spec.ts
  - [ ] roles.guard.spec.ts

**Week 2:**
- [ ] Timesheets module (100% coverage)
  - [ ] timesheets.service.spec.ts
  - [ ] timesheets.controller.spec.ts
- [ ] Time Entries module (100% coverage)
  - [ ] time-entries.service.spec.ts
  - [ ] time-entries.controller.spec.ts
  - [ ] DTO validation specs

**Week 3:**
- [ ] Common module helpers (95% coverage)
  - [ ] case-transform.helper.spec.ts
  - [ ] zod-validation.pipe.spec.ts
  - [ ] Guards specs
- [ ] Review and adjust based on coverage reports

---

### Phase 2: High-Priority Modules (3-4 weeks)
**Target: 80% overall coverage**

**Week 4-5:**
- [ ] Projects module (95% coverage)
- [ ] Tasks module (95% coverage)
- [ ] Leave Requests module (95% coverage)

**Week 6-7:**
- [ ] Calendar module (95% coverage)
- [ ] Users module (95% coverage)
- [ ] User Import service (95% coverage)

---

### Phase 3: Remaining Modules (2-3 weeks)
**Target: 95% overall coverage**

**Week 8-9:**
- [ ] Organization module (95% coverage)
- [ ] Holidays module (90% coverage)
- [ ] Benefit Types module (90% coverage)
- [ ] Timesheet Policies module (90% coverage)

**Week 10:**
- [ ] Search module (85% coverage)
- [ ] Health module (85% coverage)
- [ ] Coverage gap analysis

---

### Phase 4: Edge Cases & 100% (1-2 weeks)
**Target: 100% coverage**

**Week 11-12:**
- [ ] Identify remaining uncovered branches
- [ ] Add edge case tests
- [ ] Integration test scenarios
- [ ] Final coverage verification
- [ ] Documentation updates

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Unit Tests

on:
  push:
    branches: [main, develop, 'claude/**']
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test:cov

      - name: Check coverage thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 95" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 95% threshold"
            exit 1
          fi

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Pre-commit Hooks

```json
// package.json
{
  "scripts": {
    "test:changed": "vitest related --run",
    "pre-commit": "pnpm lint && pnpm test:changed"
  }
}
```

### Coverage Badges

```markdown
<!-- README.md -->
[![Coverage](https://codecov.io/gh/alcazardaas/kairosbe/branch/main/graph/badge.svg)](https://codecov.io/gh/alcazardaas/kairosbe)
```

---

## Best Practices

### Do's ✅

1. **Write tests first (TDD when possible)**
   - Define expected behavior
   - Write failing test
   - Implement feature
   - Test passes

2. **Mock external dependencies**
   - Database (DbService)
   - HTTP requests
   - File system
   - External APIs

3. **Test one thing per test**
   - Single assertion (when possible)
   - Clear test name
   - Easy to debug failures

4. **Use descriptive test names**
   ```typescript
   // ✅ Good
   it('should throw ForbiddenException when employee tries to approve timesheet', () => {})

   // ❌ Bad
   it('test approval', () => {})
   ```

5. **Follow Arrange-Act-Assert**
   ```typescript
   it('should create user', async () => {
     // Arrange
     const dto = { email: 'test@example.com', name: 'Test' };

     // Act
     const result = await service.create(dto);

     // Assert
     expect(result.email).toBe('test@example.com');
   });
   ```

6. **Test error conditions**
   ```typescript
   it('should throw NotFoundException when user not found', async () => {
     mockDb.select().from().where.mockResolvedValue([]);

     await expect(service.findOne('invalid-id')).rejects.toThrow(
       NotFoundException,
     );
   });
   ```

7. **Clean up after tests**
   ```typescript
   afterEach(() => {
     jest.clearAllMocks();
   });
   ```

8. **Use test data builders**
   ```typescript
   // test/builders/timesheet.builder.ts
   export class TimesheetBuilder {
     private data = {
       id: 'ts-1',
       userId: 'user-1',
       status: 'draft',
       weekStartDate: '2025-01-06',
     };

     withStatus(status: string) {
       this.data.status = status;
       return this;
     }

     build() {
       return this.data;
     }
   }

   // Usage in tests
   const timesheet = new TimesheetBuilder()
     .withStatus('submitted')
     .build();
   ```

### Don'ts ❌

1. **Don't test implementation details**
   ```typescript
   // ❌ Bad: Testing internal method calls
   it('should call _internalHelper', () => {
     service.publicMethod();
     expect(service._internalHelper).toHaveBeenCalled();
   });

   // ✅ Good: Testing behavior
   it('should return formatted result', () => {
     const result = service.publicMethod();
     expect(result).toEqual(expectedOutput);
   });
   ```

2. **Don't share state between tests**
   ```typescript
   // ❌ Bad: Shared mutable state
   let sharedData = { count: 0 };

   it('test 1', () => {
     sharedData.count++;
     expect(sharedData.count).toBe(1);
   });

   it('test 2', () => {
     // Depends on test 1 running first!
     expect(sharedData.count).toBe(1);
   });

   // ✅ Good: Isolated state
   it('test 1', () => {
     const data = { count: 0 };
     data.count++;
     expect(data.count).toBe(1);
   });
   ```

3. **Don't make database calls**
   ```typescript
   // ❌ Bad: Real database
   it('should save user', async () => {
     await db.insert(users).values({ email: 'test@example.com' });
     const result = await db.select().from(users);
     expect(result).toHaveLength(1);
   });

   // ✅ Good: Mocked database
   it('should save user', async () => {
     mockDb.insert().values.mockResolvedValue([{ id: '1' }]);
     const result = await service.create({ email: 'test@example.com' });
     expect(mockDb.insert).toHaveBeenCalled();
   });
   ```

4. **Don't test third-party libraries**
   ```typescript
   // ❌ Bad: Testing bcrypt
   it('should hash password', () => {
     const hash = bcrypt.hashSync('password', 10);
     expect(bcrypt.compareSync('password', hash)).toBe(true);
   });

   // ✅ Good: Test your code that uses bcrypt
   it('should create user with hashed password', async () => {
     const result = await service.create({ password: 'password' });
     expect(result.password).not.toBe('password'); // Not plain text
     expect(result.password).toMatch(/^\$2[aby]\$/); // Bcrypt format
   });
   ```

5. **Don't skip assertions**
   ```typescript
   // ❌ Bad: No assertion
   it('should call service', () => {
     service.doSomething();
   });

   // ✅ Good: Clear assertion
   it('should call service and return result', () => {
     const result = service.doSomething();
     expect(result).toBeDefined();
     expect(mockDependency.method).toHaveBeenCalled();
   });
   ```

---

## Test Utilities & Helpers

### Test Setup File

```typescript
// test/setup.ts
import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SESSION_SECRET = 'test-secret';

// Global test timeout
vi.setConfig({ testTimeout: 10000 });

// Mock console in tests (optional)
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};
```

### Test Builders

```typescript
// test/builders/index.ts
export { UserBuilder } from './user.builder';
export { TimesheetBuilder } from './timesheet.builder';
export { TimeEntryBuilder } from './time-entry.builder';
export { ProjectBuilder } from './project.builder';

// Example: user.builder.ts
export class UserBuilder {
  private data: any = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'employee',
    tenantId: 'tenant-1',
  };

  withRole(role: string) {
    this.data.role = role;
    return this;
  }

  withEmail(email: string) {
    this.data.email = email;
    return this;
  }

  build() {
    return this.data;
  }
}
```

### Mock Factories

```typescript
// test/mocks/drizzle.mock.ts
export function createMockDrizzle() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
}

// test/mocks/db-service.mock.ts
import { createMockDrizzle } from './drizzle.mock';

export function createMockDbService() {
  return {
    drizzle: createMockDrizzle(),
  };
}
```

### Test Constants

```typescript
// test/constants.ts
export const TEST_TENANT_ID = 'tenant-test-123';
export const TEST_USER_ID = 'user-test-456';
export const TEST_PROJECT_ID = 'project-test-789';

export const VALID_WEEK_START = '2025-01-06'; // Monday
export const VALID_TIME_ENTRY = {
  userId: TEST_USER_ID,
  projectId: TEST_PROJECT_ID,
  weekStartDate: VALID_WEEK_START,
  dayOfWeek: 1,
  hours: 8,
};
```

---

## Running Tests

### Commands

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:cov

# Run specific file
pnpm test src/auth/auth.service.spec.ts

# Run specific test suite
pnpm test -- --grep="AuthService"

# Run changed files only (useful in CI)
pnpm test:changed

# Update snapshots (if using snapshot testing)
pnpm test -- -u
```

### Watch Mode Usage

```bash
# Start watch mode
pnpm test:watch

# In watch mode:
# - Press 'a' to run all tests
# - Press 'f' to run only failed tests
# - Press 'p' to filter by filename
# - Press 't' to filter by test name
# - Press 'q' to quit
```

### Debugging Tests

```typescript
// Add .only to run single test
it.only('should debug this test', () => {
  console.log('Debug output');
  expect(true).toBe(true);
});

// Add .skip to skip test
it.skip('should skip this test', () => {
  // Won't run
});

// Use debugger
it('should debug', () => {
  debugger; // Breakpoint here
  const result = service.method();
  expect(result).toBe(expected);
});
```

---

## Maintenance & Updates

### When to Update Tests

1. **Feature changes:** Update tests when behavior changes
2. **Bug fixes:** Add test to reproduce bug, then fix
3. **Refactoring:** Tests should still pass (if behavior unchanged)
4. **New features:** Write tests for new code

### Test Review Checklist

- [ ] Tests follow naming conventions
- [ ] Arrange-Act-Assert pattern used
- [ ] Mocks used for external dependencies
- [ ] Error cases tested
- [ ] Edge cases covered
- [ ] No database/network calls
- [ ] Tests are independent
- [ ] Coverage thresholds met

### Continuous Improvement

1. **Weekly:** Review failed tests, fix flaky tests
2. **Monthly:** Review coverage reports, identify gaps
3. **Quarterly:** Review test patterns, update standards
4. **Annually:** Major test infrastructure updates

---

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

### Tools
- [Codecov](https://codecov.io/) - Coverage reporting
- [Wallaby.js](https://wallabyjs.com/) - Test runner IDE extension
- [Majestic](https://github.com/Raathigesh/majestic) - Test UI

---

## Appendix

### Glossary

- **Unit Test:** Test of a single function/method in isolation
- **Integration Test:** Test of multiple components working together
- **E2E Test:** Test of full user workflow (API → DB)
- **Mock:** Fake implementation of a dependency
- **Stub:** Minimal mock with predefined responses
- **Spy:** Mock that records calls for assertions
- **Coverage:** Percentage of code executed during tests
- **TDD:** Test-Driven Development (write tests first)
- **AAA:** Arrange-Act-Assert pattern

### Common Patterns Reference

See examples above in [Test Patterns](#test-patterns) section.

---

**Document Status:** ✅ Complete
**Next Review:** After Phase 1 completion
**Owner:** Development Team
**Approver:** Technical Lead
