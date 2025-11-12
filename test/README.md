# Test Utilities

This directory contains test utilities, helpers, mocks, and examples for the Kairos Backend test suite.

## Directory Structure

```
test/
├── setup.ts                  # Global test setup (loaded before all tests)
├── builders/                 # Test data builders (Builder pattern)
│   ├── index.ts
│   ├── user.builder.ts
│   ├── timesheet.builder.ts
│   ├── time-entry.builder.ts
│   └── project.builder.ts
├── mocks/                    # Mock factories
│   ├── index.ts
│   ├── drizzle.mock.ts       # Drizzle ORM mocks
│   └── db-service.mock.ts    # DbService mocks
├── constants/                # Test constants and sample data
│   ├── index.ts
│   └── test-data.ts
├── examples/                 # Example test files (documentation)
│   ├── auth.service.example.spec.ts
│   ├── timesheets.controller.example.spec.ts
│   └── case-transform.helper.example.spec.ts
└── README.md                 # This file
```

## Usage

### Test Data Builders

Builders provide a fluent API for creating test data:

```typescript
import { UserBuilder, TimesheetBuilder } from '../../test/builders';

// Create a test user
const user = new UserBuilder()
  .withEmail('test@example.com')
  .asManager()
  .build();

// Create a test timesheet
const timesheet = new TimesheetBuilder()
  .withUserId(user.id)
  .asSubmitted()
  .withTotalHours(40)
  .build();
```

**Available Builders:**
- `UserBuilder` - User data with role helpers
- `TimesheetBuilder` - Timesheet data with status helpers
- `TimeEntryBuilder` - Time entry data with day helpers
- `ProjectBuilder` - Project data with status helpers

### Mock Factories

Factories create pre-configured mocks:

```typescript
import { createMockDbService } from '../../test/mocks';

const mockDbService = createMockDbService();

// Configure mock behavior
mockDbService.drizzle.select().from().where.mockResolvedValue([
  { id: '1', name: 'Test' }
]);

// Use in test module
const module = await Test.createTestingModule({
  providers: [
    MyService,
    { provide: DbService, useValue: mockDbService },
  ],
}).compile();
```

**Available Mocks:**
- `createMockDrizzle()` - Drizzle query builder mock
- `createMockDrizzleWithTransaction()` - Drizzle with transaction support
- `createMockDbService()` - DbService mock
- `createMockDbServiceWithTransaction()` - DbService with transactions

### Test Constants

Reusable test IDs and data:

```typescript
import {
  TEST_TENANT_ID,
  TEST_USER_ID,
  VALID_WEEK_START,
  VALID_TIME_ENTRY,
} from '../../test/constants';

// Use in tests
mockDbService.drizzle.select().from().where.mockResolvedValue([
  { ...VALID_TIME_ENTRY, userId: TEST_USER_ID }
]);
```

**Available Constants:**
- Test IDs: `TEST_TENANT_ID`, `TEST_USER_ID`, `TEST_MANAGER_ID`, etc.
- Test dates: `VALID_WEEK_START`, `VALID_WEEK_END`, `VALID_DATE`
- Test objects: `VALID_USER`, `VALID_PROJECT`, `VALID_TIME_ENTRY`, etc.
- Pagination: `DEFAULT_PAGINATION`
- Error messages: `ERROR_MESSAGES`

## Example Tests

The `/test/examples` directory contains fully documented example test files:

1. **auth.service.example.spec.ts**
   - Service testing with database mocks
   - Error handling
   - Multi-scenario tests
   - Security testing

2. **timesheets.controller.example.spec.ts**
   - Controller testing
   - Request/response handling
   - Query parameter validation
   - Authorization checks

3. **case-transform.helper.example.spec.ts**
   - Pure function testing
   - Edge case testing
   - Nested structure handling
   - Roundtrip testing

**Note:** Example files are NOT run in the test suite. They are for documentation only.

## Writing Tests

### Step-by-Step Guide

1. **Create test file next to source file:**
   ```
   src/module/service.ts
   src/module/service.spec.ts  ← Create this
   ```

2. **Import test utilities:**
   ```typescript
   import { Test, TestingModule } from '@nestjs/testing';
   import { createMockDbService } from '../../test/mocks';
   import { UserBuilder } from '../../test/builders';
   import { TEST_TENANT_ID } from '../../test/constants';
   ```

3. **Set up test module:**
   ```typescript
   describe('MyService', () => {
     let service: MyService;
     let mockDbService: ReturnType<typeof createMockDbService>;

     beforeEach(async () => {
       mockDbService = createMockDbService();

       const module = await Test.createTestingModule({
         providers: [
           MyService,
           { provide: DbService, useValue: mockDbService },
         ],
       }).compile();

       service = module.get(MyService);
     });

     afterEach(() => {
       jest.clearAllMocks();
     });

     // Tests here...
   });
   ```

4. **Write tests using Arrange-Act-Assert:**
   ```typescript
   it('should do something when given valid input', async () => {
     // Arrange
     const input = new UserBuilder().build();
     mockDbService.drizzle.select().from().where.mockResolvedValue([input]);

     // Act
     const result = await service.method(input);

     // Assert
     expect(result).toBeDefined();
     expect(mockDbService.drizzle.select).toHaveBeenCalled();
   });
   ```

### Quick Tips

✅ **Do:**
- Use descriptive test names: `should X when Y`
- Test one thing per test
- Mock external dependencies
- Use builders for test data
- Clean up after tests (`afterEach`)
- Test error conditions
- Follow Arrange-Act-Assert pattern

❌ **Don't:**
- Make actual database calls
- Share state between tests
- Test implementation details
- Test framework/library code
- Skip error cases

## Running Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:cov

# Run specific file
pnpm test src/auth/auth.service.spec.ts

# Run tests matching pattern
pnpm test -- --grep="AuthService"
```

## Coverage

Coverage reports are generated in `/coverage` directory:

- `coverage/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI
- `coverage/coverage-final.json` - Raw coverage data

**Thresholds:**
- Lines: 95%
- Functions: 95%
- Branches: 90%
- Statements: 95%

## CI/CD Integration

Tests run automatically on:
- Push to main, develop, or claude/* branches
- Pull requests to main or develop

Coverage reports are uploaded to Codecov and commented on PRs.

## Common Patterns

### Testing Services with Database

```typescript
describe('MyService', () => {
  let service: MyService;
  let mockDrizzle: any;

  beforeEach(async () => {
    mockDrizzle = createMockDrizzle();
    const module = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: DbService, useValue: { drizzle: mockDrizzle } },
      ],
    }).compile();
    service = module.get(MyService);
  });

  it('should query database', async () => {
    mockDrizzle.select().from().where.mockResolvedValue([{ id: '1' }]);
    const result = await service.findOne('1');
    expect(result.id).toBe('1');
  });
});
```

### Testing Controllers

```typescript
describe('MyController', () => {
  let controller: MyController;
  let mockService: jest.Mocked<MyService>;

  beforeEach(async () => {
    mockService = { findAll: jest.fn() } as any;
    const module = await Test.createTestingModule({
      controllers: [MyController],
      providers: [{ provide: MyService, useValue: mockService }],
    }).compile();
    controller = module.get(MyController);
  });

  it('should call service', async () => {
    mockService.findAll.mockResolvedValue([]);
    await controller.findAll(TEST_TENANT_ID, {});
    expect(mockService.findAll).toHaveBeenCalled();
  });
});
```

### Testing Transformations

```typescript
describe('transformHelper', () => {
  it('should transform data', () => {
    const input = { user_id: '123' };
    const result = transformKeysToCamel(input);
    expect(result).toEqual({ userId: '123' });
  });
});
```

## Troubleshooting

### Mock not working

```typescript
// ❌ Wrong: Mock after test runs
it('test', async () => {
  const result = await service.method();
  mockDrizzle.select().from().where.mockResolvedValue([]);
});

// ✅ Correct: Mock before method call
it('test', async () => {
  mockDrizzle.select().from().where.mockResolvedValue([]);
  const result = await service.method();
});
```

### Test timeout

```typescript
// Increase timeout for slow tests
it('slow test', async () => {
  // ... test code
}, 15000); // 15 seconds
```

### Cannot find module

```typescript
// Use correct relative paths
import { MyService } from '../../src/my/my.service';  // ✅
import { MyService } from 'src/my/my.service';        // ❌
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Project Test Plan](../docs/UNIT_TEST_PLAN.md)
- [Example Tests](./examples/)

## Contributing

When adding new test utilities:

1. Add to appropriate directory (`builders/`, `mocks/`, `constants/`)
2. Export from `index.ts`
3. Document with JSDoc comments
4. Add usage example in this README
5. Consider adding to example tests

---

**Need Help?** Check the example tests in `/test/examples/` for comprehensive patterns and best practices.
