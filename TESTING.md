# Testing Guide

**Comprehensive unit testing guide for Kairos Backend NestJS application**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Testing Philosophy](#testing-philosophy)
- [Test Structure](#test-structure)
- [Writing New Tests](#writing-new-tests)
- [Mock Infrastructure](#mock-infrastructure)
- [Test Patterns](#test-patterns)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

---

## Overview

### Testing Stack

- **Framework:** Vitest v2.1.9 (fast, Jest-compatible)
- **NestJS Testing:** `@nestjs/testing` for DI and module testing
- **Mocking:** Vitest's built-in `vi.fn()` and `vi.mock()`
- **Coverage:** Vitest coverage (c8 provider)

### Current Coverage

**✅ 33 test files | ~1,350+ tests | 95%+ coverage**

All major modules have comprehensive test coverage:
- Auth (sessions, bcrypt, auth service)
- Core business logic (timesheets, time entries, projects, tasks, leave requests)
- Configuration (benefit types, holidays, policies)
- User management (users, organization)
- Utilities (calendar, search, health)

---

## Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test

# Watch mode (re-runs on file changes)
pnpm test:watch

# Generate coverage report
pnpm test:cov

# Run specific test file
pnpm test src/auth/sessions.service.spec.ts

# Run tests matching pattern
pnpm test --grep "should create user"
```

### Coverage Reports

Coverage reports are generated in `coverage/` directory:

```bash
pnpm test:cov

# Open HTML report
open coverage/index.html
```

**Coverage Targets:**
- **Lines:** 95%+
- **Functions:** 95%+
- **Branches:** 90%+
- **Statements:** 95%+

---

## Testing Philosophy

### Principles

1. **Test Behavior, Not Implementation**
   - Focus on inputs, outputs, and side effects
   - Don't test internal private methods directly
   - Mock external dependencies only

2. **Arrange-Act-Assert (AAA) Pattern**
   - **Arrange:** Set up test data and mocks
   - **Act:** Execute the code under test
   - **Assert:** Verify the results

3. **Comprehensive Coverage**
   - Happy path (successful operations)
   - Edge cases (boundary conditions, empty data)
   - Error scenarios (validation failures, not found, permission denied)
   - Business logic validation (circular refs, balance checks, etc.)

4. **Isolation**
   - Each test is independent
   - No shared state between tests
   - Clear mocks after each test

---

## Test Structure

### File Naming

Test files must be colocated with source files and use `.spec.ts` extension:

```
src/
  users/
    users.service.ts
    users.service.spec.ts      ← Test file
    users.controller.ts
    users.controller.spec.ts   ← Test file
```

### Test File Structure

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnderTest } from './service-under-test.service';
import { DependencyService } from '../dependency/dependency.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

/**
 * ServiceUnderTest Unit Tests
 * Brief description of what this test suite covers
 * Target Coverage: 100%
 */
describe('ServiceUnderTest', () => {
  let service: ServiceUnderTest;
  let mockDependency: ReturnType<typeof createMockDbService>;

  // Mock data at top for reusability
  const mockData = {
    id: 'test-id',
    name: 'Test Name',
    // ... other fields
  };

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockDependency = createMockDbService();

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceUnderTest,
        { provide: DependencyService, useValue: mockDependency },
      ],
    }).compile();

    // Get service instance
    service = module.get<ServiceUnderTest>(ServiceUnderTest);
  });

  afterEach(() => {
    // Clean up mocks
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('methodName', () => {
    it('should perform expected operation', async () => {
      // Arrange
      mockDependency.method.mockResolvedValue(mockData);

      // Act
      const result = await service.methodName();

      // Assert
      expect(result).toEqual(mockData);
      expect(mockDependency.method).toHaveBeenCalledWith(expectedParams);
    });

    it('should throw error on failure', async () => {
      // Arrange
      mockDependency.method.mockRejectedValue(new Error('Test error'));

      // Act & Assert
      await expect(service.methodName()).rejects.toThrow('Test error');
    });
  });
});
```

---

## Writing New Tests

### Step-by-Step Guide

#### 1. Create Test File

Create a `.spec.ts` file next to your source file:

```bash
touch src/my-module/my-module.service.spec.ts
```

#### 2. Set Up Test Suite

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { MyModuleService } from './my-module.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID } from '../../test/constants';

describe('MyModuleService', () => {
  let service: MyModuleService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyModuleService,
        { provide: DbService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<MyModuleService>(MyModuleService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

#### 3. Add Test Cases

For each method in your service/controller:

```typescript
describe('findAll', () => {
  it('should return paginated list', async () => {
    // Arrange
    const mockData = [{ id: '1', name: 'Test' }];
    mockDbService.db.select().from().where.mockResolvedValue(mockData);

    // Act
    const result = await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20 });

    // Assert
    expect(result.data).toEqual(mockData);
    expect(result.total).toBeDefined();
  });

  it('should filter by search query', async () => {
    // Test filtering logic
  });

  it('should throw NotFoundException when not found', async () => {
    mockDbService.db.select().from().where.mockResolvedValue([]);

    await expect(service.findAll(TEST_TENANT_ID, {})).rejects.toThrow(NotFoundException);
  });
});
```

#### 4. Test All Scenarios

**Minimum test coverage for each method:**

✅ **Happy path** - Successful operation
✅ **Validation** - Invalid inputs
✅ **Not found** - Entity doesn't exist
✅ **Permissions** - Unauthorized access
✅ **Edge cases** - Empty data, nulls, boundaries
✅ **Business logic** - Domain-specific rules

---

## Mock Infrastructure

### Available Mocks

Located in `test/mocks/`:

#### 1. DbService Mock

```typescript
import { createMockDbService } from '../../test/mocks';

const mockDbService = createMockDbService();

// Configure mock chain
mockDbService.db
  .select()
  .from()
  .where.mockResolvedValue([mockData]);

// Multiple sequential queries
mockDbService.db
  .select()
  .from()
  .where.mockResolvedValueOnce([result1])
  .mockResolvedValueOnce([result2]);
```

**Methods available:**
- `db.select().from().where` - SELECT queries
- `db.insert().values` - INSERT queries
- `db.update().set` - UPDATE queries
- `db.delete().where` - DELETE queries
- `db.select().from().where().orderBy().limit().offset` - Paginated queries
- `getDb()` - Returns mock Drizzle instance

#### 2. ConfigService Mock

```typescript
import { createMockConfigService } from '../../test/mocks';

const mockConfigService = createMockConfigService({
  SESSION_TTL: 3600,
  CUSTOM_VAR: 'test-value',
});

// Methods available
mockConfigService.get('SESSION_TTL'); // Returns 3600
mockConfigService.getOrThrow('SESSION_TTL'); // Returns 3600 or throws
```

#### 3. Constants

```typescript
import { TEST_TENANT_ID, TEST_USER_ID } from '../../test/constants';

// Use in tests for consistency
const result = await service.findAll(TEST_TENANT_ID, filters);
```

### Creating New Mocks

When you need to mock a new service:

```typescript
// test/mocks/my-service.mock.ts
import { vi } from 'vitest';

export function createMockMyService() {
  return {
    method1: vi.fn(),
    method2: vi.fn(),
    // ... all public methods
  };
}

// Export from test/mocks/index.ts
export { createMockMyService } from './my-service.mock';
```

---

## Test Patterns

### Pattern 1: Testing CRUD Operations

```typescript
describe('create', () => {
  const createDto = {
    name: 'New Item',
    description: 'Test description',
  };

  it('should create new item', async () => {
    // Arrange
    const expected = { id: 'new-id', ...createDto };
    mockDbService.db.insert().values.mockResolvedValue([expected]);

    // Act
    const result = await service.create(TEST_TENANT_ID, createDto);

    // Assert
    expect(result.id).toBeDefined();
    expect(result.name).toBe(createDto.name);
    expect(mockDbService.db.insert().values).toHaveBeenCalled();
  });

  it('should throw ConflictException on duplicate', async () => {
    const error: any = new Error('Duplicate');
    error.code = '23505'; // PostgreSQL unique violation
    mockDbService.db.insert().values.mockRejectedValue(error);

    await expect(service.create(TEST_TENANT_ID, createDto))
      .rejects.toThrow(ConflictException);
  });
});
```

### Pattern 2: Testing Pagination

```typescript
describe('findAll with pagination', () => {
  it('should return paginated results', async () => {
    // Arrange
    mockDbService.db
      .select()
      .from()
      .where.mockResolvedValueOnce([{ count: 50 }]) // count query
      .mockResolvedValueOnce([mockItem]); // data query

    // Act
    const result = await service.findAll(TEST_TENANT_ID, { page: 2, limit: 20 });

    // Assert
    expect(result.page).toBe(2);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(50);
    expect(result.totalPages).toBe(3);
    expect(mockDbService.db.select().from().where().orderBy().limit().offset)
      .toHaveBeenCalledWith(20); // offset for page 2
  });
});
```

### Pattern 3: Testing Permissions

```typescript
describe('delete with permissions', () => {
  it('should throw ForbiddenException on self-delete', async () => {
    // Act & Assert
    await expect(service.delete(TEST_TENANT_ID, TEST_USER_ID, TEST_USER_ID))
      .rejects.toThrow(ForbiddenException);
    await expect(service.delete(TEST_TENANT_ID, TEST_USER_ID, TEST_USER_ID))
      .rejects.toThrow('Cannot delete your own account');
  });

  it('should allow manager to delete direct report', async () => {
    mockDbService.db
      .select()
      .from()
      .where.mockResolvedValueOnce([{ id: TEST_USER_ID }]) // user exists
      .mockResolvedValueOnce([{ role: 'manager' }]) // current user role
      .mockResolvedValueOnce([{ managerUserId: 'manager-1' }]); // is direct report

    mockDbService.db.update().set.mockResolvedValue([]);

    await service.delete(TEST_TENANT_ID, TEST_USER_ID, 'manager-1');

    expect(mockDbService.db.update().set).toHaveBeenCalled();
  });
});
```

### Pattern 4: Testing Business Logic

```typescript
describe('circular reference detection', () => {
  it('should detect circular manager reference', async () => {
    // Arrange: A -> B -> C, trying to set C's manager to A
    mockDbService.db
      .select()
      .from()
      .where.mockResolvedValueOnce([{ id: 'A' }]) // A exists
      .mockResolvedValueOnce([{ managerUserId: 'B' }]) // A's manager is B
      .mockResolvedValueOnce([{ managerUserId: 'C' }]); // B's manager is C

    // Act & Assert
    await expect(service.validateManager(TEST_TENANT_ID, 'A', 'C'))
      .rejects.toThrow(BadRequestException);
    await expect(service.validateManager(TEST_TENANT_ID, 'A', 'C'))
      .rejects.toThrow('Circular manager reference detected');
  });
});
```

### Pattern 5: Testing Controllers

```typescript
describe('POST /users', () => {
  const createDto = {
    email: 'new@example.com',
    name: 'New User',
    role: 'employee' as const,
  };

  it('should create user', async () => {
    // Arrange
    const mockResponse = { data: { id: 'new-id', ...createDto } };
    service.create.mockResolvedValue(mockResponse);

    // Act
    const result = await controller.create(TEST_TENANT_ID, mockSession, createDto);

    // Assert
    expect(result).toEqual(mockResponse);
    expect(service.create).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      createDto,
      mockSession.userId
    );
  });

  it('should extract userId from session', async () => {
    service.create.mockResolvedValue({ data: mockUser });
    const customSession = { userId: 'custom-id' };

    await controller.create(TEST_TENANT_ID, customSession, createDto);

    expect(service.create).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      createDto,
      'custom-id'
    );
  });
});
```

---

## Coverage Requirements

### Target Coverage

All modules should maintain:

- **Lines:** ≥ 95%
- **Functions:** ≥ 95%
- **Branches:** ≥ 90%
- **Statements:** ≥ 95%

### What to Test

✅ **Must Test:**
- All public methods in services
- All controller endpoints
- Validation logic
- Error handling
- Business rules
- Permission checks
- Data transformations

❌ **Don't Test:**
- Third-party libraries
- NestJS framework code
- Database drivers
- Type definitions
- Trivial getters/setters

### Coverage Exceptions

Some code may be excluded from coverage:
- Generated files
- Database migrations
- Configuration files
- Main.ts bootstrap code

---

## Best Practices

### ✅ DO

1. **Use Descriptive Test Names**
   ```typescript
   // ✅ Good
   it('should throw NotFoundException when user not found in tenant')

   // ❌ Bad
   it('should work')
   ```

2. **One Assertion Per Concept**
   ```typescript
   // ✅ Good - Test one thing
   it('should return user with correct email', async () => {
     const result = await service.findOne(id);
     expect(result.email).toBe('test@example.com');
   });

   it('should return user with active status', async () => {
     const result = await service.findOne(id);
     expect(result.status).toBe('active');
   });

   // ❌ Bad - Testing multiple unrelated things
   it('should return user', async () => {
     const result = await service.findOne(id);
     expect(result.email).toBe('test@example.com');
     expect(result.status).toBe('active');
     expect(result.role).toBe('admin');
     expect(result.permissions).toHaveLength(5);
   });
   ```

3. **Clear Arrange-Act-Assert**
   ```typescript
   it('should create timesheet', async () => {
     // Arrange
     const createDto = { weekStartDate: '2025-01-01' };
     mockDbService.db.insert().values.mockResolvedValue([mockTimesheet]);

     // Act
     const result = await service.create(TEST_TENANT_ID, createDto);

     // Assert
     expect(result.weekStartDate).toBe('2025-01-01');
   });
   ```

4. **Test Edge Cases**
   ```typescript
   it('should handle empty search query', async () => {
     const result = await service.search(TEST_TENANT_ID, '');
     expect(result).toEqual([]);
   });

   it('should handle null manager', async () => {
     const user = { ...mockUser, managerUserId: null };
     mockDbService.db.select().from().where.mockResolvedValue([user]);

     const result = await service.findOne(TEST_TENANT_ID, userId);
     expect(result.managerUserId).toBeNull();
   });
   ```

5. **Mock Only External Dependencies**
   ```typescript
   // ✅ Good - Mock external service
   mockDbService.db.select().from().where.mockResolvedValue([mockData]);

   // ❌ Bad - Don't mock the service under test
   vi.spyOn(service, 'findOne').mockResolvedValue(mockData);
   ```

### ❌ DON'T

1. **Don't Share State Between Tests**
   ```typescript
   // ❌ Bad - Shared state
   let sharedData = { count: 0 };

   it('test 1', () => {
     sharedData.count++; // Modifies shared state
   });

   it('test 2', () => {
     expect(sharedData.count).toBe(0); // Fails if test 1 ran first
   });
   ```

2. **Don't Test Implementation Details**
   ```typescript
   // ❌ Bad - Testing private method
   it('should call private method', () => {
     const spy = vi.spyOn(service as any, '_privateMethod');
     service.publicMethod();
     expect(spy).toHaveBeenCalled();
   });

   // ✅ Good - Test public behavior
   it('should process data correctly', () => {
     const result = service.publicMethod(input);
     expect(result).toEqual(expectedOutput);
   });
   ```

3. **Don't Skip Test Cleanup**
   ```typescript
   // ✅ Good - Always clean up
   afterEach(() => {
     vi.clearAllMocks();
   });
   ```

4. **Don't Use Magic Numbers**
   ```typescript
   // ❌ Bad
   const result = await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20 });
   expect(result.total).toBe(42);

   // ✅ Good
   const EXPECTED_TOTAL = 42;
   const result = await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20 });
   expect(result.total).toBe(EXPECTED_TOTAL);
   ```

---

## Troubleshooting

### Common Issues

#### 1. Mock Chain Not Working

**Problem:**
```typescript
mockDbService.db.select().from().where.mockResolvedValue([mockData]);
// Error: Cannot read property 'from' of undefined
```

**Solution:**
Ensure mock chain is properly configured in `createMockDbService()`:

```typescript
// test/mocks/db-service.mock.ts
const chainMock = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  // ... other methods
};
```

#### 2. Test Timing Out

**Problem:**
```
Test timeout after 5000ms
```

**Solution:**
- Ensure all async operations are properly awaited
- Check that mocks are returning values (not hanging)
- Increase timeout for slow operations:

```typescript
it('slow operation', async () => {
  // ... test code
}, 10000); // 10 second timeout
```

#### 3. Mocks Not Being Called

**Problem:**
```typescript
expect(mockDbService.db.select).toHaveBeenCalled();
// Error: Expected mock to be called
```

**Solution:**
- Verify the service is using the mocked dependency
- Check that beforeEach sets up mocks correctly
- Ensure you're calling the right method

#### 4. Tests Passing Locally But Failing in CI

**Problem:**
Tests pass on local machine but fail in CI pipeline.

**Solution:**
- Avoid time-dependent tests (use fixed dates)
- Don't rely on filesystem state
- Clear mocks between tests
- Avoid test interdependencies

---

## Examples

### Complete Service Test Example

```typescript
// src/projects/projects.service.spec.ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { DbService } from '../db/db.service';
import { createMockDbService } from '../../test/mocks';
import { TEST_TENANT_ID } from '../../test/constants';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockDbService: ReturnType<typeof createMockDbService>;

  const mockProject = {
    id: 'project-1',
    tenant_id: TEST_TENANT_ID,
    name: 'Project Alpha',
    code: 'PROJ-001',
    active: true,
  };

  beforeEach(async () => {
    mockDbService = createMockDbService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: DbService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockProject]);

      const result = await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by active status', async () => {
      mockDbService.db
        .select()
        .from()
        .where.mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockProject]);

      await service.findAll(TEST_TENANT_ID, { page: 1, limit: 20, active: true });

      expect(mockDbService.db.select().from().where).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'New Project',
      code: 'PROJ-002',
    };

    it('should create new project', async () => {
      mockDbService.db.insert().values.mockResolvedValue([
        { id: 'new-id', ...createDto },
      ]);

      const result = await service.create(TEST_TENANT_ID, createDto);

      expect(result.name).toBe(createDto.name);
    });

    it('should throw ConflictException on duplicate code', async () => {
      const error: any = new Error('Duplicate');
      error.code = '23505';
      mockDbService.db.insert().values.mockRejectedValue(error);

      await expect(service.create(TEST_TENANT_ID, createDto))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete project', async () => {
      mockDbService.db.select().from().where.mockResolvedValue([mockProject]);
      mockDbService.db.delete().where.mockResolvedValue([]);

      await service.delete(TEST_TENANT_ID, 'project-1');

      expect(mockDbService.db.delete().where).toHaveBeenCalled();
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockDbService.db.select().from().where.mockResolvedValue([]);

      await expect(service.delete(TEST_TENANT_ID, 'nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
```

### Complete Controller Test Example

```typescript
// src/projects/projects.controller.spec.ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { TEST_TENANT_ID } from '../../test/constants';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: vi.Mocked<ProjectsService>;

  const mockProject = {
    id: 'project-1',
    name: 'Project Alpha',
    code: 'PROJ-001',
    active: true,
  };

  beforeEach(async () => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: service }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /projects', () => {
    it('should return paginated projects', async () => {
      const mockResponse = {
        data: [mockProject],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(TEST_TENANT_ID, { page: 1, limit: 20 });

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith(TEST_TENANT_ID, { page: 1, limit: 20 });
    });
  });

  describe('POST /projects', () => {
    it('should create project', async () => {
      const createDto = { name: 'New Project', code: 'PROJ-002' };
      service.create.mockResolvedValue(mockProject);

      const result = await controller.create(TEST_TENANT_ID, createDto);

      expect(result).toEqual(mockProject);
      expect(service.create).toHaveBeenCalledWith(TEST_TENANT_ID, createDto);
    });
  });
});
```

---

## Quick Reference

### Test Checklist for New Features

When adding a new feature, ensure tests cover:

- [ ] Happy path (successful operation)
- [ ] Validation errors (invalid inputs)
- [ ] Not found errors (entity doesn't exist)
- [ ] Permission errors (unauthorized access)
- [ ] Conflict errors (duplicate entries)
- [ ] Edge cases (empty data, nulls, boundaries)
- [ ] Business logic rules
- [ ] Data transformation (snake_case ↔ camelCase)
- [ ] Pagination (if applicable)
- [ ] Filtering (if applicable)
- [ ] Sorting (if applicable)
- [ ] Tenant isolation

### Common Test Commands

```bash
# Run all tests
pnpm test

# Run specific file
pnpm test src/auth/sessions.service.spec.ts

# Run with coverage
pnpm test:cov

# Watch mode
pnpm test:watch

# Run tests matching pattern
pnpm test --grep "should create"

# Update snapshots (if using)
pnpm test -u
```

---

**Questions or Issues?**

Refer to existing test files for patterns and examples. All 33 test files in the codebase follow these conventions.

**Happy Testing! 🧪**
