/**
 * Test constants and sample data
 * Reusable test data across all test files
 */

// Test IDs
export const TEST_TENANT_ID = 'tenant-test-00000000-0000-0000-0000-000000000001';
export const TEST_USER_ID = 'user-test-00000000-0000-0000-0000-000000000001';
export const TEST_MANAGER_ID = 'user-test-00000000-0000-0000-0000-000000000002';
export const TEST_ADMIN_ID = 'user-test-00000000-0000-0000-0000-000000000003';
export const TEST_PROJECT_ID = 'project-test-00000000-0000-0000-0000-000000000001';
export const TEST_TASK_ID = 'task-test-00000000-0000-0000-0000-000000000001';
export const TEST_TIMESHEET_ID = 'timesheet-test-00000000-0000-0000-0000-000000000001';
export const TEST_TIME_ENTRY_ID = 'time-entry-test-00000000-0000-0000-0000-000000000001';
export const TEST_LEAVE_REQUEST_ID = 'leave-request-test-00000000-0000-0000-0000-000000000001';

// Test dates (ISO format)
export const VALID_WEEK_START = '2025-01-06'; // Monday
export const VALID_WEEK_END = '2025-01-12'; // Sunday
export const VALID_DATE = '2025-01-10'; // Friday

// Test user data
export const VALID_USER = {
  id: TEST_USER_ID,
  email: 'test.user@example.com',
  name: 'Test User',
  role: 'employee' as const,
  tenantId: TEST_TENANT_ID,
};

export const VALID_MANAGER = {
  id: TEST_MANAGER_ID,
  email: 'test.manager@example.com',
  name: 'Test Manager',
  role: 'manager' as const,
  tenantId: TEST_TENANT_ID,
};

export const VALID_ADMIN = {
  id: TEST_ADMIN_ID,
  email: 'test.admin@example.com',
  name: 'Test Admin',
  role: 'admin' as const,
  tenantId: TEST_TENANT_ID,
};

// Test project data
export const VALID_PROJECT = {
  id: TEST_PROJECT_ID,
  tenantId: TEST_TENANT_ID,
  name: 'Test Project',
  code: 'TEST-001',
  status: 'active' as const,
  createdBy: TEST_ADMIN_ID,
};

// Test task data
export const VALID_TASK = {
  id: TEST_TASK_ID,
  tenantId: TEST_TENANT_ID,
  projectId: TEST_PROJECT_ID,
  name: 'Test Task',
  description: 'Test task description',
  status: 'active' as const,
};

// Test timesheet data
export const VALID_TIMESHEET = {
  id: TEST_TIMESHEET_ID,
  tenantId: TEST_TENANT_ID,
  userId: TEST_USER_ID,
  weekStartDate: VALID_WEEK_START,
  status: 'draft' as const,
  totalHours: 40,
};

// Test time entry data
export const VALID_TIME_ENTRY = {
  id: TEST_TIME_ENTRY_ID,
  tenantId: TEST_TENANT_ID,
  timesheetId: TEST_TIMESHEET_ID,
  userId: TEST_USER_ID,
  projectId: TEST_PROJECT_ID,
  taskId: TEST_TASK_ID,
  weekStartDate: VALID_WEEK_START,
  dayOfWeek: 1, // Monday
  hours: 8,
  note: 'Test work',
};

// Test leave request data
export const VALID_LEAVE_REQUEST = {
  id: TEST_LEAVE_REQUEST_ID,
  tenantId: TEST_TENANT_ID,
  userId: TEST_USER_ID,
  benefitTypeId: 'benefit-test-00000000-0000-0000-0000-000000000001',
  startDate: '2025-02-01',
  endDate: '2025-02-05',
  days: 5,
  status: 'pending' as const,
  reason: 'Vacation',
};

// Test pagination
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
};

// Test session token
export const VALID_SESSION_TOKEN = 'session-token-00000000-0000-0000-0000-000000000001';

// Test error messages
export const ERROR_MESSAGES = {
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  BAD_REQUEST: 'Bad Request',
  VALIDATION_FAILED: 'Validation failed',
};
