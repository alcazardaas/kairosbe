# Bulk User Import - Technical Specification

**Feature:** Excel/CSV bulk user import with dry-run validation, template download, and audit logging
**Target:** Admin users only
**Status:** Implementation Ready
**Date:** 2025-11-09

---

## Overview

Implement a robust, idempotent bulk import system for users/employees from Excel (.xlsx) or CSV files. The system validates all rows before any database operations, supports dry-run mode, provides template downloads, and maintains full audit trails.

---

## Business Requirements

### Functional Requirements

1. **Admin-only Access**: Only users with 'admin' role can perform bulk imports
2. **File Format Support**: Accept both CSV and Excel (.xlsx) files
3. **Validation-First**: Validate ALL rows before creating ANY users
4. **Dry-Run Mode**: Support validation-only mode without database changes
5. **Template Download**: Provide sample template file for users
6. **Error Reporting**: Return detailed validation errors with row numbers
7. **Audit Trail**: Log all import operations to audit_logs table
8. **Idempotency**: Handle duplicate emails gracefully
9. **Manager Resolution**: Accept manager email and resolve to user ID
10. **Invitation Flow**: Send invitation emails to imported users (reuse existing flow)

### Non-Functional Requirements

1. **Performance**: Process up to 500 users synchronously (< 30 seconds)
2. **File Size Limit**: Maximum 10MB upload
3. **Transaction Safety**: All-or-nothing on validation failure
4. **Security**: Validate file types, prevent injection attacks
5. **Maintainability**: Reuse existing user creation logic
6. **Observability**: Structured logging for debugging

---

## Technical Design

### Architecture Overview

```
┌─────────────┐
│   Admin UI  │
└──────┬──────┘
       │ POST /api/v1/users/import
       │ (multipart/form-data)
       ▼
┌─────────────────────────────────────┐
│  UsersController.importUsers()      │
│  - File upload (Multer)             │
│  - Authorization (@Roles('admin'))  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  UserImportService                  │
│  ┌─────────────────────────────┐   │
│  │ 1. Parse file (CSV/Excel)   │   │
│  │ 2. Validate all rows        │   │
│  │ 3. Resolve manager emails   │   │
│  │ 4. Check duplicates         │   │
│  │ 5. Return errors OR create  │   │
│  └─────────────────────────────┘   │
└──────┬──────────────────────────────┘
       │
       ├─────► UsersService.create() (reused)
       │
       └─────► AuditService.log() (new)
```

### New Components

#### 1. Import Controller
- **File:** `src/users/users.controller.ts` (extend existing)
- **Endpoints:**
  - `POST /api/v1/users/import` - Upload and process file
  - `GET /api/v1/users/import/template` - Download sample template

#### 2. Import Service
- **File:** `src/users/services/user-import.service.ts` (new)
- **Responsibilities:**
  - Parse CSV/Excel files
  - Validate rows against schema
  - Resolve manager emails to UUIDs
  - Detect duplicate emails
  - Orchestrate bulk creation
  - Generate error reports

#### 3. Audit Service
- **File:** `src/common/audit/audit.service.ts` (new)
- **Responsibilities:**
  - Log import operations
  - Store metadata in audit_logs table
  - Reusable for other audit events

#### 4. DTOs
- **File:** `src/users/dto/import-user.dto.ts` (new)
- **Schemas:**
  - `ImportUserRowDto` - Single row validation
  - `ImportRequestDto` - Request parameters
  - `ImportResultDto` - Response format
  - `ImportErrorDto` - Error details

---

## API Specification

### Endpoint 1: Bulk Import

**Request:**
```http
POST /api/v1/users/import?dryRun=false
Authorization: Bearer <session-token>
Content-Type: multipart/form-data

file: <users.csv or users.xlsx>
```

**Query Parameters:**
- `dryRun` (boolean, optional, default: false): If true, validate only without creating users

**Request Body (multipart):**
- `file` (required): CSV or Excel file

**Response (Success - Validation Errors):**
```json
{
  "success": false,
  "dryRun": false,
  "totalRows": 100,
  "validRows": 95,
  "errorCount": 5,
  "errors": [
    {
      "row": 3,
      "email": "invalid-email",
      "errors": [
        "email: Invalid email format"
      ]
    },
    {
      "row": 7,
      "email": "john@example.com",
      "errors": [
        "managerEmail: Manager not found in tenant: boss@example.com",
        "role: Invalid enum value. Expected 'admin' | 'manager' | 'employee', received 'owner'"
      ]
    },
    {
      "row": 12,
      "email": "duplicate@example.com",
      "errors": [
        "email: User already exists in this tenant"
      ]
    }
  ]
}
```

**Response (Success - Dry Run Valid):**
```json
{
  "success": true,
  "dryRun": true,
  "totalRows": 100,
  "validRows": 100,
  "errorCount": 0,
  "message": "Validation successful. All 100 users are valid and ready to import."
}
```

**Response (Success - Users Created):**
```json
{
  "success": true,
  "dryRun": false,
  "totalRows": 100,
  "validRows": 100,
  "errorCount": 0,
  "createdCount": 85,
  "existingCount": 15,
  "message": "Successfully imported 85 new users and added 15 existing users to tenant.",
  "createdUsers": [
    {
      "id": "uuid-1",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "employee",
      "status": "invited"
    }
  ],
  "existingUsers": [
    {
      "id": "uuid-2",
      "email": "jane@example.com",
      "name": "Jane Smith",
      "role": "manager",
      "status": "invited",
      "note": "User already existed, added to tenant"
    }
  ]
}
```

**Error Responses:**

401 Unauthorized:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

403 Forbidden:
```json
{
  "statusCode": 403,
  "message": "Forbidden: Admin role required"
}
```

400 Bad Request (No file):
```json
{
  "statusCode": 400,
  "message": "No file uploaded"
}
```

400 Bad Request (Invalid file type):
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only CSV and Excel (.xlsx) files are supported."
}
```

413 Payload Too Large:
```json
{
  "statusCode": 413,
  "message": "File size exceeds 10MB limit"
}
```

400 Bad Request (Empty file):
```json
{
  "statusCode": 400,
  "message": "File is empty or contains no valid data rows"
}
```

---

### Endpoint 2: Download Template

**Request:**
```http
GET /api/v1/users/import/template?format=csv
Authorization: Bearer <session-token>
```

**Query Parameters:**
- `format` (string, optional, default: 'csv'): Template format - 'csv' or 'xlsx'

**Response:**
- Content-Type: `text/csv` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="user-import-template.csv"`
- Body: Template file with headers and example rows

**Template Content (CSV):**
```csv
email,name,role,jobTitle,startDate,managerEmail,location,phone
john.doe@example.com,John Doe,employee,Software Engineer,2025-01-15,alice.manager@example.com,New York,+1-555-0100
jane.smith@example.com,Jane Smith,manager,Engineering Manager,2025-01-10,,San Francisco,+1-555-0200
bob.admin@example.com,Bob Admin,admin,CTO,2025-01-01,,Remote,+1-555-0300
```

---

## File Format Specification

### Supported Formats
1. **CSV**: Comma-separated values (.csv)
2. **Excel**: Office Open XML (.xlsx)

### Required Columns
- `email` (string, required): User email address (must be unique)
- `role` (string, required): One of: 'admin', 'manager', 'employee'

### Optional Columns
- `name` (string): User full name (max 255 chars)
- `jobTitle` (string): Job title (max 255 chars)
- `startDate` (string): Start date in YYYY-MM-DD format
- `managerEmail` (string): Manager's email address (must exist in tenant)
- `location` (string): Office location (max 255 chars)
- `phone` (string): Phone number (max 50 chars)

### Column Mapping Rules
- **Case-insensitive**: Headers can be "Email", "email", "EMAIL"
- **Flexible naming**:
  - `email`: Also accepts "Email Address", "E-mail", "User Email"
  - `name`: Also accepts "Full Name", "Name", "User Name"
  - `role`: Also accepts "Role", "User Role"
  - `jobTitle`: Also accepts "Job Title", "Title", "Position"
  - `startDate`: Also accepts "Start Date", "Hire Date", "Join Date"
  - `managerEmail`: Also accepts "Manager Email", "Manager", "Reports To"
  - `location`: Also accepts "Location", "Office", "Office Location"
  - `phone`: Also accepts "Phone", "Phone Number", "Contact Number"

### Validation Rules

#### Email
- Must be valid email format (RFC 5322)
- Maximum 255 characters
- Must be unique within import file
- If exists globally: Add membership to tenant
- If exists in tenant: Validation error

#### Name
- Optional
- Minimum 1 character if provided
- Maximum 255 characters

#### Role
- Required
- Must be one of: 'admin', 'manager', 'employee'
- Case-insensitive matching

#### Job Title
- Optional
- Maximum 255 characters

#### Start Date
- Optional
- Must be in YYYY-MM-DD format
- Must be a valid date
- Can be past or future date

#### Manager Email
- Optional
- Must be valid email format if provided
- Manager must exist in the same tenant
- Manager must have valid membership (active or invited)
- Cannot create circular manager relationships

#### Location
- Optional
- Maximum 255 characters

#### Phone
- Optional
- Maximum 50 characters
- No specific format validation (accepts international formats)

---

## Data Flow

### 1. File Upload & Validation

```typescript
// Step 1: Receive file
POST /api/v1/users/import
- Multer intercepts multipart/form-data
- Validates file type (.csv, .xlsx)
- Validates file size (max 10MB)
- Saves to memory buffer

// Step 2: Parse file
UserImportService.parseFile(buffer, mimetype)
- Detect format (CSV vs Excel)
- Parse to array of row objects
- Normalize column names (camelCase)
- Return rows array

// Step 3: Validate rows
UserImportService.validateRows(rows, tenantId)
- For each row:
  - Validate against zod schema
  - Check email uniqueness within file
  - Resolve manager email to UUID
  - Check for duplicate membership
  - Collect errors with row number
- Return: { validRows, errors }

// Step 4: Check for errors
if (errors.length > 0) {
  return ImportResultDto with errors
}

// Step 5: Dry-run check
if (dryRun === true) {
  return success message (no DB operations)
}

// Step 6: Bulk create users
UserImportService.bulkCreateUsers(validRows, tenantId, actorUserId)
- Start DB transaction
- For each valid row:
  - Call UsersService.create() (reuse existing logic)
  - Track created vs existing users
- Commit transaction
- Return created users

// Step 7: Audit log
AuditService.log({
  tenantId,
  actorUserId,
  action: 'bulk_user_import',
  entity: 'users',
  afterJson: { totalRows, createdCount, existingCount }
})

// Step 8: Return result
return ImportResultDto with success
```

### 2. Template Download

```typescript
GET /api/v1/users/import/template?format=csv

// Generate template file
- Create headers row
- Add 2-3 example rows
- Set appropriate Content-Type
- Set Content-Disposition header
- Stream file to response
```

---

## Database Schema Changes

### New Table: import_jobs (Optional - Future Enhancement)

**Note:** For MVP, we won't create this table. Audit logs will track imports. This is here for future async implementation.

```sql
CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  total_rows INTEGER NOT NULL,
  valid_rows INTEGER NOT NULL,
  created_count INTEGER NOT NULL DEFAULT 0,
  existing_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_import_jobs_tenant ON import_jobs(tenant_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
```

### Existing Table: audit_logs

**Location:** Already exists in schema
**Usage:** Log bulk import operations

```sql
INSERT INTO audit_logs (
  tenant_id,
  actor_user_id,
  action,
  entity,
  entity_id,
  after_json
) VALUES (
  $1, -- tenantId
  $2, -- actorUserId
  'bulk_user_import',
  'users',
  NULL,
  jsonb_build_object(
    'fileName', 'users.csv',
    'totalRows', 100,
    'createdCount', 85,
    'existingCount', 15,
    'errorCount', 0,
    'dryRun', false
  )
);
```

---

## Implementation Steps

### Phase 1: Setup & Dependencies

**Step 1.1: Install Required Packages**
```bash
pnpm add xlsx papaparse
pnpm add -D @types/multer @types/papaparse
```

**Dependencies:**
- `xlsx` (0.18.5+): Excel parsing
- `papaparse` (5.4.1+): CSV parsing with better error handling
- `@types/multer`: TypeScript types for Multer
- `@types/papaparse`: TypeScript types for PapaParse

**Step 1.2: Configure Multer Storage**

Create file: `src/common/config/multer.config.ts`
- Set memory storage (no disk writes)
- Set file size limit: 10MB
- File filter: CSV and Excel only

---

### Phase 2: Create Audit Service

**Step 2.1: Create Audit Module**

Create directory: `src/common/audit/`

Files to create:
- `audit.module.ts` - Module definition
- `audit.service.ts` - Service implementation
- `audit.service.spec.ts` - Unit tests

**Step 2.2: Implement AuditService**

Methods:
```typescript
async log(data: {
  tenantId: string;
  actorUserId: string;
  action: string;
  entity: string;
  entityId?: string;
  beforeJson?: any;
  afterJson?: any;
}): Promise<void>
```

**Step 2.3: Export AuditModule**

Add to `src/app.module.ts` imports

---

### Phase 3: Create Import DTOs

**Step 3.1: Create DTO File**

Create file: `src/users/dto/import-user.dto.ts`

**Step 3.2: Define Zod Schemas**

```typescript
// Single row validation schema
export const importUserRowSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['admin', 'manager', 'employee']),
  jobTitle: z.string().max(255).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  managerEmail: z.string().email().max(255).optional(),
  location: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
});

export type ImportUserRowDto = z.infer<typeof importUserRowSchema>;

// Import request query params
export const importRequestQuerySchema = z.object({
  dryRun: z.boolean().default(false),
});

export type ImportRequestQueryDto = z.infer<typeof importRequestQuerySchema>;

// Template request query params
export const templateRequestQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
});

export type TemplateRequestQueryDto = z.infer<typeof templateRequestQuerySchema>;
```

**Step 3.3: Define Response DTOs**

```typescript
// Error detail for single row
export class ImportRowErrorDto {
  @ApiProperty()
  row: number;

  @ApiProperty()
  email: string;

  @ApiProperty({ type: [String] })
  errors: string[];
}

// Import result response
export class ImportResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  dryRun: boolean;

  @ApiProperty()
  totalRows: number;

  @ApiProperty()
  validRows: number;

  @ApiProperty()
  errorCount: number;

  @ApiProperty({ required: false })
  createdCount?: number;

  @ApiProperty({ required: false })
  existingCount?: number;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty({ type: [ImportRowErrorDto], required: false })
  errors?: ImportRowErrorDto[];

  @ApiProperty({ type: [Object], required: false })
  createdUsers?: any[];

  @ApiProperty({ type: [Object], required: false })
  existingUsers?: any[];
}
```

---

### Phase 4: Create Import Service

**Step 4.1: Create Service File**

Create file: `src/users/services/user-import.service.ts`

**Step 4.2: Implement File Parser**

```typescript
async parseFile(
  buffer: Buffer,
  mimetype: string
): Promise<Record<string, any>[]>
```

Logic:
- Detect file type from mimetype
- Parse CSV with PapaParse
- Parse Excel with xlsx library
- Normalize column names to camelCase
- Handle BOM in CSV files
- Return array of row objects

**Step 4.3: Implement Column Mapper**

```typescript
private normalizeColumnName(header: string): string | null
```

Logic:
- Convert to lowercase
- Remove spaces, underscores, hyphens
- Map flexible column names to standard names
- Return null for unknown columns (ignore)

**Step 4.4: Implement Row Validator**

```typescript
async validateRows(
  rows: Record<string, any>[],
  tenantId: string
): Promise<{
  validRows: ImportUserRowDto[];
  errors: ImportRowErrorDto[];
}>
```

Logic:
- Validate each row against zod schema
- Check email uniqueness within file (Map<email, rowNumber>)
- Resolve manager emails to UUIDs (batch lookup)
- Check for duplicate tenant membership (batch lookup)
- Collect errors with row numbers
- Return valid rows and errors

**Step 4.5: Implement Manager Resolver**

```typescript
private async resolveManagerEmails(
  emails: string[],
  tenantId: string
): Promise<Map<string, string>>
```

Logic:
- Query users + memberships by email array
- Filter by tenant membership
- Return Map<email, userId>
- Cache for performance

**Step 4.6: Implement Duplicate Checker**

```typescript
private async checkExistingMemberships(
  emails: string[],
  tenantId: string
): Promise<Set<string>>
```

Logic:
- Query users + memberships by email array
- Filter by tenant_id match
- Return Set of emails that already exist in tenant

**Step 4.7: Implement Bulk Creator**

```typescript
async bulkCreateUsers(
  rows: ImportUserRowDto[],
  tenantId: string,
  actorUserId: string
): Promise<{
  createdUsers: any[];
  existingUsers: any[];
}>
```

Logic:
- Start database transaction
- For each row:
  - Call existing `UsersService.create()`
  - Catch ConflictException for existing memberships
  - Track created vs existing
- Commit transaction on success, rollback on error
- Return created and existing user lists

**Step 4.8: Implement Main Import Method**

```typescript
async importUsers(
  file: Express.Multer.File,
  tenantId: string,
  actorUserId: string,
  dryRun: boolean
): Promise<ImportResultDto>
```

Logic:
- Parse file
- Validate rows
- If errors, return error report
- If dryRun, return success message
- Bulk create users
- Log to audit
- Return success result

---

### Phase 5: Create Template Generator

**Step 5.1: Add Template Generator Method**

Add to `UserImportService`:

```typescript
generateTemplate(format: 'csv' | 'xlsx'): {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}
```

Logic:
- Create headers array
- Add 2-3 example rows
- Generate CSV with PapaParse
- Generate Excel with xlsx library
- Return buffer, filename, mimetype

**Example Data:**
```javascript
const headers = [
  'email', 'name', 'role', 'jobTitle',
  'startDate', 'managerEmail', 'location', 'phone'
];

const examples = [
  {
    email: 'john.doe@example.com',
    name: 'John Doe',
    role: 'employee',
    jobTitle: 'Software Engineer',
    startDate: '2025-01-15',
    managerEmail: 'alice.manager@example.com',
    location: 'New York',
    phone: '+1-555-0100'
  },
  {
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    role: 'manager',
    jobTitle: 'Engineering Manager',
    startDate: '2025-01-10',
    managerEmail: '',
    location: 'San Francisco',
    phone: '+1-555-0200'
  }
];
```

---

### Phase 6: Update Users Controller

**Step 6.1: Inject Import Service**

Modify `src/users/users.controller.ts`:
- Inject `UserImportService` in constructor

**Step 6.2: Add Import Endpoint**

```typescript
@Post('import')
@Roles('admin')
@UseInterceptors(FileInterceptor('file', multerConfig))
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
      },
    },
  },
})
@ApiQuery({ name: 'dryRun', required: false, type: Boolean })
@ApiResponse({ status: 200, type: ImportResultDto })
@ApiResponse({ status: 400, description: 'Invalid file or validation errors' })
@ApiResponse({ status: 403, description: 'Admin role required' })
async importUsers(
  @CurrentTenantId() tenantId: string,
  @CurrentUserId() userId: string,
  @UploadedFile() file: Express.Multer.File,
  @Query(new ZodValidationPipe(importRequestQuerySchema))
  query: ImportRequestQueryDto
): Promise<ImportResultDto>
```

Logic:
- Validate file exists
- Call `userImportService.importUsers()`
- Return result

**Step 6.3: Add Template Endpoint**

```typescript
@Get('import/template')
@Roles('admin')
@ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'] })
@ApiResponse({ status: 200, description: 'Template file download' })
async downloadTemplate(
  @Query(new ZodValidationPipe(templateRequestQuerySchema))
  query: TemplateRequestQueryDto,
  @Res() res: Response
): Promise<void>
```

Logic:
- Generate template
- Set Content-Type header
- Set Content-Disposition header
- Stream buffer to response

---

### Phase 7: Update Users Module

**Step 7.1: Register Import Service**

Modify `src/users/users.module.ts`:
- Add `UserImportService` to providers array
- Import `AuditModule`

---

### Phase 8: Testing

**Step 8.1: Unit Tests - Import Service**

Create file: `src/users/services/user-import.service.spec.ts`

Test cases:
- ✓ Parse CSV file successfully
- ✓ Parse Excel file successfully
- ✓ Normalize column names (case-insensitive, flexible)
- ✓ Validate rows - all valid
- ✓ Validate rows - collect errors for invalid rows
- ✓ Resolve manager emails to UUIDs
- ✓ Detect duplicate emails within file
- ✓ Detect existing tenant memberships
- ✓ Bulk create users - transaction success
- ✓ Bulk create users - transaction rollback on error
- ✓ Generate CSV template
- ✓ Generate Excel template

**Step 8.2: Unit Tests - Audit Service**

Create file: `src/common/audit/audit.service.spec.ts`

Test cases:
- ✓ Log audit entry successfully
- ✓ Handle missing optional fields

**Step 8.3: Integration Tests - Import Controller**

Create file: `src/users/users.controller.import.spec.ts`

Test cases:
- ✓ Import CSV - all valid users created
- ✓ Import CSV - validation errors returned
- ✓ Import Excel - all valid users created
- ✓ Import - dry run returns success without creating
- ✓ Import - existing users added to tenant
- ✓ Import - duplicate tenant membership errors
- ✓ Import - manager resolution
- ✓ Import - 403 for non-admin users
- ✓ Import - 400 for missing file
- ✓ Import - 400 for invalid file type
- ✓ Import - 413 for oversized file
- ✓ Download template - CSV format
- ✓ Download template - Excel format

**Step 8.4: Manual Testing**

Create sample files:
- `test-data/valid-users.csv` (10 valid users)
- `test-data/valid-users.xlsx` (10 valid users)
- `test-data/invalid-users.csv` (mix of valid/invalid)
- `test-data/duplicate-users.csv` (duplicate emails)
- `test-data/manager-chain.csv` (manager relationships)

Test with cURL:
```bash
# Import CSV (dry run)
curl -X POST http://localhost:3000/api/v1/users/import?dryRun=true \
  -H "Authorization: Bearer <token>" \
  -F "file=@test-data/valid-users.csv"

# Import CSV (real)
curl -X POST http://localhost:3000/api/v1/users/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@test-data/valid-users.csv"

# Download template
curl -X GET http://localhost:3000/api/v1/users/import/template?format=csv \
  -H "Authorization: Bearer <token>" \
  -o template.csv
```

---

### Phase 9: Documentation

**Step 9.1: Update API Documentation**

Update file: `docs/API_USER_MANAGEMENT.md` (or create if missing)

Add sections:
- Bulk User Import
- Template Download
- File format specification
- Validation rules
- Error handling examples

**Step 9.2: Update OpenAPI/Swagger**

Ensure Swagger decorators are complete:
- @ApiTags('users')
- @ApiOperation({ summary: '...' })
- @ApiResponse({ status: 200, type: ImportResultDto })
- @ApiConsumes('multipart/form-data')
- @ApiBody schema for file upload

**Step 9.3: Update CLAUDE.md**

Add to "Implemented Features" section:
```markdown
### User Management (Admin)
- POST `/users/import` - Bulk import from CSV/Excel with dry-run
- GET `/users/import/template` - Download import template
```

**Step 9.4: Create User Guide**

Create file: `docs/USER_IMPORT_GUIDE.md`

Contents:
- How to prepare import file
- Column descriptions
- Common validation errors
- Dry-run workflow
- Troubleshooting

---

### Phase 10: Error Handling & Edge Cases

**Step 10.1: File Upload Errors**

Handle:
- No file uploaded → 400 Bad Request
- Invalid file type → 400 Bad Request
- File too large → 413 Payload Too Large
- Corrupted file → 400 Bad Request

**Step 10.2: Parsing Errors**

Handle:
- Empty file → 400 Bad Request
- No header row → 400 Bad Request
- Missing required columns → 400 Bad Request
- Malformed CSV/Excel → 400 Bad Request

**Step 10.3: Validation Errors**

Handle:
- Invalid email format → Return in errors array
- Invalid role enum → Return in errors array
- Manager not found → Return in errors array
- Duplicate email in file → Return in errors array
- Duplicate tenant membership → Return in errors array
- Circular manager reference → Return in errors array
- Invalid date format → Return in errors array

**Step 10.4: Transaction Errors**

Handle:
- Database constraint violation → Rollback + 500 error
- Connection timeout → Rollback + 500 error
- Unique constraint on email → Should not happen (checked in validation)

**Step 10.5: Memory Management**

Handle:
- Large file processing → Stream parsing if needed
- Memory cleanup after processing → Clear buffers
- Timeout for long imports → 30 second HTTP timeout

---

### Phase 11: Security Considerations

**Step 11.1: Input Validation**

- ✓ File type whitelist (CSV, Excel only)
- ✓ File size limit (10MB)
- ✓ Email format validation (prevent injection)
- ✓ SQL injection prevention (parameterized queries via Drizzle)
- ✓ XSS prevention (validate all text fields)

**Step 11.2: Authorization**

- ✓ Admin-only access via @Roles('admin')
- ✓ Tenant isolation via session context
- ✓ Manager validation within tenant scope

**Step 11.3: Data Privacy**

- ✓ No passwords in import file
- ✓ Audit log for tracking who imported
- ✓ PII handling (names, emails, phones)

**Step 11.4: Rate Limiting**

- Future: Add rate limiting to prevent abuse
- Future: Limit imports per hour per admin

---

### Phase 12: Performance Optimization

**Step 12.1: Batch Database Queries**

- Manager resolution: Single query for all manager emails
- Duplicate check: Single query for all user emails
- Bulk insert: Use Drizzle batch insert if possible

**Step 12.2: Memory Optimization**

- Use streaming for large files (future enhancement)
- Clear file buffer after processing
- Limit concurrent imports (future: job queue)

**Step 12.3: Response Time**

Target performance:
- 100 users: < 5 seconds
- 500 users: < 30 seconds
- 1000+ users: Consider async processing (future)

---

## Testing Strategy

### Unit Tests

**AuditService:**
- ✓ Log entry created successfully
- ✓ Handles null entityId
- ✓ Handles null beforeJson/afterJson

**UserImportService - Parser:**
- ✓ Parse valid CSV
- ✓ Parse valid Excel
- ✓ Handle BOM in CSV
- ✓ Handle empty file
- ✓ Handle missing headers
- ✓ Normalize column names

**UserImportService - Validator:**
- ✓ Validate all valid rows
- ✓ Collect errors for invalid rows
- ✓ Detect duplicate emails in file
- ✓ Resolve manager emails
- ✓ Check existing memberships

**UserImportService - Creator:**
- ✓ Create new users
- ✓ Add existing users to tenant
- ✓ Handle transaction rollback
- ✓ Track created vs existing counts

### Integration Tests

**Import Endpoint:**
- ✓ Full CSV import flow (valid)
- ✓ Full Excel import flow (valid)
- ✓ Dry-run mode (no DB changes)
- ✓ Validation errors returned
- ✓ Authorization (admin-only)
- ✓ File upload errors
- ✓ Audit log created

**Template Endpoint:**
- ✓ Download CSV template
- ✓ Download Excel template
- ✓ Correct headers
- ✓ Example rows present

### Manual Tests

**Happy Path:**
1. Download template
2. Fill with 10 valid users
3. Dry-run import → Success
4. Real import → 10 users created
5. Check audit_logs table
6. Verify invitations sent

**Error Cases:**
1. Upload invalid file type → 400 error
2. Upload oversized file → 413 error
3. Upload file with invalid emails → Validation errors
4. Upload file with duplicate emails → Validation errors
5. Upload file with non-existent manager → Validation errors
6. Try import as non-admin → 403 error

**Edge Cases:**
1. Import user that exists globally → Add to tenant
2. Import user that exists in tenant → Error
3. Import with circular manager chain → Error
4. Import with special characters in names → Success
5. Import with international phone numbers → Success

---

## Rollout Plan

### Step 1: Development
- Complete implementation (Phases 1-12)
- Run all unit tests
- Run all integration tests
- Manual testing with sample files

### Step 2: Code Review
- Submit PR with implementation
- Review code against CLAUDE.md standards
- Review security considerations
- Review performance optimizations

### Step 3: Staging Deployment
- Deploy to staging environment
- Test with realistic data (100-500 users)
- Verify audit logs
- Verify invitations (if email configured)

### Step 4: Documentation
- Update API documentation
- Create user guide
- Create sample templates
- Update changelog

### Step 5: Production Deployment
- Deploy to production
- Monitor error rates
- Monitor performance
- Monitor audit logs

### Step 6: User Training
- Share user guide with admins
- Provide sample templates
- Demonstrate dry-run workflow
- Collect feedback

---

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Async Processing**
   - Add job queue (Bull + Redis)
   - Create import_jobs table
   - Websocket progress updates
   - Email notification on completion

2. **Advanced Validation**
   - Custom validation rules per tenant
   - Role-based field requirements
   - Department/team assignment
   - Custom field mapping

3. **Import History**
   - GET `/users/imports` - List past imports
   - GET `/users/imports/:id` - Get import details
   - GET `/users/imports/:id/errors` - Download error CSV
   - Retry failed imports

4. **Update Mode**
   - Support updating existing users
   - Merge or replace profile data
   - Update role assignments
   - Deactivate missing users

5. **Export**
   - GET `/users/export` - Export users to CSV/Excel
   - Include all profile fields
   - Filter by role, status, department

6. **Advanced Error Reporting**
   - Downloadable error CSV with highlighted rows
   - Suggested fixes for common errors
   - Auto-correct minor issues (e.g., whitespace)

7. **Rate Limiting**
   - Limit imports per hour
   - Prevent concurrent imports by same user
   - Queue system for large imports

---

## Success Metrics

### Performance Targets
- ✓ 100 users imported in < 5 seconds
- ✓ 500 users imported in < 30 seconds
- ✓ Zero data loss (transaction safety)
- ✓ 100% validation accuracy

### Quality Targets
- ✓ 100% test coverage for import service
- ✓ Zero security vulnerabilities
- ✓ Clear error messages for all validation failures
- ✓ Full audit trail for compliance

### Usability Targets
- ✓ Template download in < 1 second
- ✓ Dry-run validation in < 10 seconds for 100 users
- ✓ Clear documentation with examples
- ✓ Self-service for admins (no developer support needed)

---

## Dependencies Summary

### New NPM Packages
```json
{
  "dependencies": {
    "xlsx": "^0.18.5",
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "@types/multer": "^1.4.11",
    "@types/papaparse": "^5.3.14"
  }
}
```

### Existing Packages (Reused)
- `@nestjs/common` - Controllers, services, modules
- `@nestjs/platform-express` - File upload (Multer)
- `zod` - Validation schemas
- `drizzle-orm` - Database queries
- `pg` - PostgreSQL connection

---

## Risk Mitigation

### Risk 1: Large File Processing
- **Risk:** 10MB file could contain 10,000+ rows, timeout
- **Mitigation:** Set HTTP timeout to 60 seconds, add async processing in Phase 2

### Risk 2: Duplicate Emails
- **Risk:** Email exists globally but not validated in tenant
- **Mitigation:** Comprehensive validation before any DB operations

### Risk 3: Manager Circular References
- **Risk:** A → B → C → A manager chain
- **Mitigation:** Reuse existing manager validation logic from UsersService

### Risk 4: Transaction Failures
- **Risk:** Partial imports due to DB constraints
- **Mitigation:** All-or-nothing transaction, comprehensive validation first

### Risk 5: Memory Leaks
- **Risk:** Large buffers not garbage collected
- **Mitigation:** Explicit cleanup, use streaming in Phase 2

### Risk 6: Security Vulnerabilities
- **Risk:** File upload exploits, injection attacks
- **Mitigation:** Strict file type validation, parameterized queries, zod validation

---

## Appendix

### A. Sample Files

**valid-users.csv:**
```csv
email,name,role,jobTitle,startDate,managerEmail,location,phone
alice@example.com,Alice Admin,admin,CTO,2025-01-01,,Remote,+1-555-0001
bob@example.com,Bob Manager,manager,Engineering Manager,2025-01-05,alice@example.com,San Francisco,+1-555-0002
charlie@example.com,Charlie Dev,employee,Senior Engineer,2025-01-10,bob@example.com,San Francisco,+1-555-0003
diana@example.com,Diana Dev,employee,Software Engineer,2025-01-15,bob@example.com,New York,+1-555-0004
```

**invalid-users.csv:**
```csv
email,name,role,jobTitle,startDate,managerEmail,location,phone
invalid-email,John Doe,employee,Engineer,2025-01-15,boss@example.com,NYC,123
jane@example.com,Jane Smith,owner,Manager,2025-01-10,,SF,456
duplicate@example.com,User 1,employee,Dev,2025-01-01,,LA,789
duplicate@example.com,User 2,employee,Dev,2025-01-01,,LA,789
```

### B. cURL Examples

**Import with dry-run:**
```bash
curl -X POST 'http://localhost:3000/api/v1/users/import?dryRun=true' \
  -H 'Authorization: Bearer eyJhbGciOi...' \
  -F 'file=@users.csv'
```

**Import real:**
```bash
curl -X POST 'http://localhost:3000/api/v1/users/import' \
  -H 'Authorization: Bearer eyJhbGciOi...' \
  -F 'file=@users.xlsx'
```

**Download CSV template:**
```bash
curl -X GET 'http://localhost:3000/api/v1/users/import/template?format=csv' \
  -H 'Authorization: Bearer eyJhbGciOi...' \
  -o template.csv
```

**Download Excel template:**
```bash
curl -X GET 'http://localhost:3000/api/v1/users/import/template?format=xlsx' \
  -H 'Authorization: Bearer eyJhbGciOi...' \
  -o template.xlsx
```

### C. Error Code Reference

| Error Code | Message | Cause |
|------------|---------|-------|
| 400 | No file uploaded | Missing file in multipart request |
| 400 | Invalid file type | File is not CSV or Excel |
| 400 | File is empty | No data rows in file |
| 400 | Missing required column: email | Email column not found |
| 400 | Missing required column: role | Role column not found |
| 400 | Validation failed | See errors array for details |
| 401 | Unauthorized | Missing or invalid session token |
| 403 | Forbidden: Admin role required | User is not admin |
| 413 | File size exceeds 10MB limit | File too large |
| 500 | Internal server error | Database or unexpected error |

### D. Validation Error Messages

| Field | Error Message |
|-------|--------------|
| email | Invalid email format |
| email | Email is required |
| email | User already exists in this tenant |
| email | Duplicate email in import file (row X) |
| role | Invalid enum value. Expected 'admin' \| 'manager' \| 'employee' |
| role | Role is required |
| startDate | Invalid date format. Expected YYYY-MM-DD |
| managerEmail | Invalid email format |
| managerEmail | Manager not found in tenant: {email} |
| managerEmail | Circular manager reference detected |
| name | Name must be at least 1 character |
| name | Name must be at most 255 characters |
| jobTitle | Job title must be at most 255 characters |
| location | Location must be at most 255 characters |
| phone | Phone must be at most 50 characters |

---

**End of Specification**

**Next Steps:**
1. Review and approve this specification
2. Begin implementation (Phase 1: Dependencies)
3. Track progress via GitHub issues/project board
4. Submit PR when complete with tests and documentation
