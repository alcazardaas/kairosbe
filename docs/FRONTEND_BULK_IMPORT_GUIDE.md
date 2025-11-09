# Frontend Implementation Guide - Bulk User Import

**Feature:** Excel/CSV bulk user import UI
**For:** Frontend Team
**Backend Spec:** See [BULK_USER_IMPORT_SPEC.md](./BULK_USER_IMPORT_SPEC.md)
**Date:** 2025-11-09

---

## Overview

This guide provides complete specifications for implementing the bulk user import feature in the frontend application. The feature allows admin users to upload CSV or Excel files to create multiple users at once.

---

## API Endpoints Reference

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All requests require session token in Authorization header:
```
Authorization: Bearer <session-token>
```

---

## Endpoint 1: Upload Import File

### Request

**Method:** `POST`
**URL:** `/api/v1/users/import`
**Query Parameters:**
- `dryRun` (boolean, optional, default: false)
  - `true` = Validate only, don't create users
  - `false` = Validate and create users

**Headers:**
```http
Authorization: Bearer <session-token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
```
file: <File object>
```

### JavaScript/TypeScript Example

```typescript
async function importUsers(
  file: File,
  dryRun: boolean = false
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `/api/v1/users/import?dryRun=${dryRun}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Import failed: ${response.statusText}`);
  }

  return await response.json();
}
```

### Response Types

**Success Response (Validation Passed):**
```typescript
interface ImportResult {
  success: true;
  dryRun: boolean;
  totalRows: number;
  validRows: number;
  errorCount: 0;
  createdCount?: number;  // Only if dryRun=false
  existingCount?: number; // Only if dryRun=false
  message?: string;
  createdUsers?: UserSummary[];  // Only if dryRun=false
  existingUsers?: UserSummary[]; // Only if dryRun=false
}

interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  status: 'invited' | 'active' | 'disabled';
  note?: string; // e.g., "User already existed, added to tenant"
}
```

**Example Success (Dry Run):**
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

**Example Success (Real Import):**
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

**Error Response (Validation Failed):**
```typescript
interface ImportResult {
  success: false;
  dryRun: boolean;
  totalRows: number;
  validRows: number;
  errorCount: number;
  errors: ImportRowError[];
}

interface ImportRowError {
  row: number;      // Row number in file (1-indexed, excluding header)
  email: string;    // Email from that row (for identification)
  errors: string[]; // List of validation error messages
}
```

**Example Error Response:**
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

### HTTP Error Responses

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden (Not Admin):**
```json
{
  "statusCode": 403,
  "message": "Forbidden: Admin role required"
}
```

**400 Bad Request (No File):**
```json
{
  "statusCode": 400,
  "message": "No file uploaded"
}
```

**400 Bad Request (Invalid File Type):**
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only CSV and Excel (.xlsx) files are supported."
}
```

**413 Payload Too Large:**
```json
{
  "statusCode": 413,
  "message": "File size exceeds 10MB limit"
}
```

**400 Bad Request (Empty File):**
```json
{
  "statusCode": 400,
  "message": "File is empty or contains no valid data rows"
}
```

---

## Endpoint 2: Download Template

### Request

**Method:** `GET`
**URL:** `/api/v1/users/import/template`
**Query Parameters:**
- `format` (string, optional, default: 'csv')
  - Values: `'csv'` or `'xlsx'`

**Headers:**
```http
Authorization: Bearer <session-token>
```

### JavaScript/TypeScript Example

```typescript
async function downloadTemplate(format: 'csv' | 'xlsx' = 'csv'): Promise<void> {
  const response = await fetch(
    `/api/v1/users/import/template?format=${format}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Template download failed: ${response.statusText}`);
  }

  // Get filename from Content-Disposition header
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = contentDisposition
    ? contentDisposition.split('filename=')[1].replace(/"/g, '')
    : `user-import-template.${format}`;

  // Download file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
```

### Response

**Success:**
- Status: 200 OK
- Content-Type: `text/csv` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="user-import-template.csv"`
- Body: Binary file content

**Template Content (CSV):**
```csv
email,name,role,jobTitle,startDate,managerEmail,location,phone
john.doe@example.com,John Doe,employee,Software Engineer,2025-01-15,alice.manager@example.com,New York,+1-555-0100
jane.smith@example.com,Jane Smith,manager,Engineering Manager,2025-01-10,,San Francisco,+1-555-0200
bob.admin@example.com,Bob Admin,admin,CTO,2025-01-01,,Remote,+1-555-0300
```

---

## File Format Specification

### Supported File Types
1. **CSV** (.csv) - Comma-separated values
2. **Excel** (.xlsx) - Office Open XML Workbook

### Maximum File Size
- **10MB** (enforced by backend)

### Required Columns
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `email` | string | ✅ Yes | Valid email address (max 255 chars) |
| `role` | enum | ✅ Yes | One of: 'admin', 'manager', 'employee' |

### Optional Columns
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | ❌ No | Full name (1-255 chars) |
| `jobTitle` | string | ❌ No | Job title (max 255 chars) |
| `startDate` | string | ❌ No | Start date in YYYY-MM-DD format |
| `managerEmail` | string | ❌ No | Manager's email (must exist in tenant) |
| `location` | string | ❌ No | Office location (max 255 chars) |
| `phone` | string | ❌ No | Phone number (max 50 chars) |

### Column Name Variations

The backend accepts flexible column names (case-insensitive):

| Standard Name | Alternative Names |
|---------------|-------------------|
| `email` | Email Address, E-mail, User Email |
| `name` | Full Name, Name, User Name |
| `role` | Role, User Role |
| `jobTitle` | Job Title, Title, Position |
| `startDate` | Start Date, Hire Date, Join Date |
| `managerEmail` | Manager Email, Manager, Reports To |
| `location` | Location, Office, Office Location |
| `phone` | Phone, Phone Number, Contact Number |

### Validation Rules

**Email:**
- Must be valid email format (RFC 5322)
- Maximum 255 characters
- Must be unique within import file
- If email exists globally but not in this tenant → User will be added to tenant
- If email exists in this tenant → Validation error

**Role:**
- Must be one of: `'admin'`, `'manager'`, `'employee'`
- Case-insensitive (e.g., 'Admin', 'ADMIN', 'admin' all work)

**Name:**
- Minimum 1 character if provided
- Maximum 255 characters

**Job Title:**
- Maximum 255 characters

**Start Date:**
- Must be in YYYY-MM-DD format
- Must be a valid date
- Can be past or future date

**Manager Email:**
- Must be valid email format if provided
- Manager must exist in the same tenant
- Cannot create circular manager relationships (A → B → C → A)

**Location:**
- Maximum 255 characters

**Phone:**
- Maximum 50 characters
- No specific format required (supports international formats)

---

## UI/UX Implementation Guide

### Page Structure

**Location:** Admin Settings → User Management → Bulk Import

**Components Needed:**
1. File upload dropzone
2. Template download buttons
3. Dry-run validation button
4. Import confirmation button
5. Progress indicator
6. Success/error results display
7. Error table with row details

---

### User Flow

#### Flow 1: Successful Import

```
1. Admin clicks "Download Template" button
   ↓
2. CSV/Excel template file downloads to computer
   ↓
3. Admin fills in user data in template
   ↓
4. Admin drags/selects file in upload zone
   ↓
5. File is validated (type, size)
   ↓
6. Admin clicks "Validate" button (dry-run)
   ↓
7. Backend validates file
   ↓
8. Success message: "All 100 users are valid"
   ↓
9. Admin clicks "Import Users" button
   ↓
10. Backend creates users
    ↓
11. Success message: "85 new users created, 15 existing users added"
    ↓
12. Results table shows created users
```

#### Flow 2: Validation Errors

```
1-6. (Same as Flow 1)
   ↓
7. Backend validates file
   ↓
8. Error message: "5 validation errors found"
   ↓
9. Error table displays:
   - Row 3: Invalid email format
   - Row 7: Manager not found
   - Row 12: User already exists in tenant
   ↓
10. Admin downloads/views file again
    ↓
11. Admin fixes errors
    ↓
12. Admin re-uploads and validates
    ↓
13. Success → Import
```

---

### UI Components

#### Component 1: Template Download

**Design:**
```
┌─────────────────────────────────────┐
│  Download Import Template           │
├─────────────────────────────────────┤
│  Get started by downloading a       │
│  template file with example data.   │
│                                     │
│  [Download CSV]  [Download Excel]   │
└─────────────────────────────────────┘
```

**Implementation:**
```tsx
function TemplateDownload() {
  const handleDownload = async (format: 'csv' | 'xlsx') => {
    try {
      await downloadTemplate(format);
      toast.success(`Template downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  return (
    <div className="card">
      <h3>Download Import Template</h3>
      <p>Get started by downloading a template file with example data.</p>
      <div className="button-group">
        <button onClick={() => handleDownload('csv')}>
          Download CSV
        </button>
        <button onClick={() => handleDownload('xlsx')}>
          Download Excel
        </button>
      </div>
    </div>
  );
}
```

---

#### Component 2: File Upload

**Design:**
```
┌─────────────────────────────────────┐
│  Upload User Import File            │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │   📁  Drag & drop file here   │  │
│  │       or click to browse      │  │
│  │                               │  │
│  │   Accepted: CSV, Excel (.xlsx)│  │
│  │   Maximum size: 10MB          │  │
│  └───────────────────────────────┘  │
│                                     │
│  Selected: users.csv (2.3MB)        │
│  [Remove]                           │
└─────────────────────────────────────┘
```

**Implementation:**
```tsx
function FileUpload({ onFileSelect }: { onFileSelect: (file: File) => void }) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Invalid file type. Please upload CSV or Excel (.xlsx) file.');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }

    setFile(selectedFile);
    onFileSelect(selectedFile);
  };

  const handleRemove = () => {
    setFile(null);
    onFileSelect(null);
  };

  return (
    <div className="card">
      <h3>Upload User Import File</h3>
      <div className="dropzone">
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="file-upload"
        />
        <label htmlFor="file-upload">
          📁 Drag & drop file here or click to browse
          <p>Accepted: CSV, Excel (.xlsx) | Maximum size: 10MB</p>
        </label>
      </div>
      {file && (
        <div className="file-info">
          Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          <button onClick={handleRemove}>Remove</button>
        </div>
      )}
    </div>
  );
}
```

---

#### Component 3: Action Buttons

**Design:**
```
┌─────────────────────────────────────┐
│  [🔍 Validate Only]  [📥 Import Users]│
└─────────────────────────────────────┘
```

**States:**
- Disabled if no file selected
- "Validate Only" → Dry-run mode (dryRun=true)
- "Import Users" → Real import (dryRun=false)
- Show loading spinner during API call

**Implementation:**
```tsx
function ActionButtons({
  file,
  onValidate,
  onImport,
  loading
}: {
  file: File | null;
  onValidate: () => void;
  onImport: () => void;
  loading: boolean;
}) {
  return (
    <div className="action-buttons">
      <button
        onClick={onValidate}
        disabled={!file || loading}
        className="btn-secondary"
      >
        {loading ? '⏳ Validating...' : '🔍 Validate Only'}
      </button>
      <button
        onClick={onImport}
        disabled={!file || loading}
        className="btn-primary"
      >
        {loading ? '⏳ Importing...' : '📥 Import Users'}
      </button>
    </div>
  );
}
```

---

#### Component 4: Results Display

**Success (Validation):**
```
┌─────────────────────────────────────┐
│  ✅ Validation Successful           │
├─────────────────────────────────────┤
│  All 100 users are valid and ready  │
│  to import.                         │
│                                     │
│  No errors found.                   │
└─────────────────────────────────────┘
```

**Success (Import):**
```
┌─────────────────────────────────────┐
│  ✅ Import Successful               │
├─────────────────────────────────────┤
│  Successfully imported 85 new users │
│  and added 15 existing users to     │
│  tenant.                            │
│                                     │
│  Total rows: 100                    │
│  Created: 85                        │
│  Existing: 15                       │
│                                     │
│  [View Created Users ▼]             │
└─────────────────────────────────────┘
```

**Error:**
```
┌─────────────────────────────────────┐
│  ❌ Validation Errors Found         │
├─────────────────────────────────────┤
│  5 errors found in 100 rows.        │
│  Please fix the errors below and    │
│  re-upload.                         │
│                                     │
│  [View Errors ▼]                    │
└─────────────────────────────────────┘
```

**Implementation:**
```tsx
function ResultsDisplay({ result }: { result: ImportResult | null }) {
  if (!result) return null;

  if (result.success) {
    return (
      <div className="alert alert-success">
        <h4>✅ {result.dryRun ? 'Validation' : 'Import'} Successful</h4>
        <p>{result.message}</p>
        {!result.dryRun && (
          <div className="stats">
            <p>Total rows: {result.totalRows}</p>
            <p>Created: {result.createdCount}</p>
            <p>Existing: {result.existingCount}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="alert alert-error">
      <h4>❌ Validation Errors Found</h4>
      <p>{result.errorCount} errors found in {result.totalRows} rows.</p>
      <p>Please fix the errors below and re-upload.</p>
    </div>
  );
}
```

---

#### Component 5: Error Table

**Design:**
```
┌───────────────────────────────────────────────────────┐
│  Validation Errors (5)                                │
├─────┬──────────────────────┬──────────────────────────┤
│ Row │ Email                │ Errors                   │
├─────┼──────────────────────┼──────────────────────────┤
│  3  │ invalid-email        │ • Invalid email format   │
├─────┼──────────────────────┼──────────────────────────┤
│  7  │ john@example.com     │ • Manager not found:     │
│     │                      │   boss@example.com       │
│     │                      │ • Invalid role: 'owner'  │
├─────┼──────────────────────┼──────────────────────────┤
│ 12  │ duplicate@example.com│ • User already exists    │
│     │                      │   in tenant              │
└─────┴──────────────────────┴──────────────────────────┘
```

**Implementation:**
```tsx
function ErrorTable({ errors }: { errors: ImportRowError[] }) {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="error-table-container">
      <h4>Validation Errors ({errors.length})</h4>
      <table className="error-table">
        <thead>
          <tr>
            <th>Row</th>
            <th>Email</th>
            <th>Errors</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((error, index) => (
            <tr key={index}>
              <td>{error.row}</td>
              <td>{error.email}</td>
              <td>
                <ul>
                  {error.errors.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### Complete Page Component

```tsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';

function BulkUserImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleValidate = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const result = await importUsers(file, true); // dryRun=true
      setResult(result);

      if (result.success) {
        toast.success('Validation successful! File is ready to import.');
      } else {
        toast.error(`Validation failed: ${result.errorCount} errors found.`);
      }
    } catch (error) {
      toast.error('Validation failed. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    const confirmed = window.confirm(
      'Are you sure you want to import these users? This action will create user accounts and send invitation emails.'
    );
    if (!confirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const result = await importUsers(file, false); // dryRun=false
      setResult(result);

      if (result.success) {
        toast.success(
          `Successfully imported ${result.createdCount} users!`
        );
      } else {
        toast.error(`Import failed: ${result.errorCount} errors found.`);
      }
    } catch (error) {
      toast.error('Import failed. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bulk-import-page">
      <h1>Bulk User Import</h1>
      <p>Import multiple users from a CSV or Excel file.</p>

      <TemplateDownload />

      <FileUpload onFileSelect={setFile} />

      <ActionButtons
        file={file}
        onValidate={handleValidate}
        onImport={handleImport}
        loading={loading}
      />

      {result && (
        <>
          <ResultsDisplay result={result} />
          {!result.success && <ErrorTable errors={result.errors} />}
        </>
      )}
    </div>
  );
}

export default BulkUserImportPage;
```

---

## Error Handling

### Client-Side Validation

**Before Upload:**
1. Check file type (.csv or .xlsx)
2. Check file size (max 10MB)
3. Show user-friendly error messages

```typescript
function validateFile(file: File): string | null {
  const allowedTypes = [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Please upload CSV or Excel (.xlsx) file.';
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return 'File size exceeds 10MB limit.';
  }

  return null; // Valid
}
```

### API Error Handling

**HTTP Status Codes:**
- 200: Success
- 400: Bad request (validation errors, invalid file)
- 401: Unauthorized (invalid session)
- 403: Forbidden (not admin)
- 413: Payload too large
- 500: Server error

```typescript
async function importUsers(
  file: File,
  dryRun: boolean
): Promise<ImportResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `/api/v1/users/import?dryRun=${dryRun}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: formData,
      }
    );

    // Handle HTTP errors
    if (response.status === 401) {
      throw new Error('Session expired. Please log in again.');
    }

    if (response.status === 403) {
      throw new Error('Admin access required for bulk import.');
    }

    if (response.status === 413) {
      throw new Error('File size exceeds 10MB limit.');
    }

    if (response.status === 400) {
      const errorData = await response.json();
      // Could be validation errors (success: false) or bad request
      if (errorData.errors) {
        return errorData; // Return validation errors
      }
      throw new Error(errorData.message || 'Invalid request');
    }

    if (!response.ok) {
      throw new Error(`Import failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
}
```

---

## User Feedback & Messages

### Success Messages

**Validation Success (Dry-run):**
```
✅ Validation successful! All 100 users are valid and ready to import.
```

**Import Success:**
```
✅ Successfully imported 85 new users and added 15 existing users to tenant.
```

### Error Messages

**Validation Errors:**
```
❌ Validation failed: 5 errors found in 100 rows.
Please review the error details below and fix your file.
```

**File Type Error:**
```
❌ Invalid file type. Only CSV and Excel (.xlsx) files are supported.
```

**File Size Error:**
```
❌ File size exceeds 10MB limit. Please reduce the file size or split into multiple imports.
```

**Authorization Error:**
```
❌ Admin access required. You do not have permission to import users.
```

**Session Expired:**
```
❌ Session expired. Please log in again.
```

**Server Error:**
```
❌ Import failed due to server error. Please try again or contact support.
```

---

## Accessibility

### ARIA Labels

```tsx
<button
  onClick={handleValidate}
  aria-label="Validate import file without creating users"
>
  Validate Only
</button>

<input
  type="file"
  aria-label="Upload CSV or Excel file for user import"
  accept=".csv,.xlsx"
/>

<table
  className="error-table"
  role="table"
  aria-label="Validation errors"
>
  ...
</table>
```

### Keyboard Navigation

- All buttons and inputs must be keyboard accessible
- File upload should work with Enter key
- Error table should be navigable with Tab

### Screen Reader Support

- Use semantic HTML (table, button, input)
- Provide clear aria-labels
- Announce success/error messages with aria-live regions

```tsx
<div role="alert" aria-live="polite">
  {result?.success
    ? 'Import successful'
    : 'Validation errors found'}
</div>
```

---

## Performance Considerations

### File Size

- **Small files** (<1MB, <100 users): Instant processing
- **Medium files** (1-5MB, 100-500 users): 5-15 seconds
- **Large files** (5-10MB, 500-1000 users): 15-30 seconds

### Loading States

Always show loading indicators during API calls:

```tsx
{loading ? (
  <div className="spinner">⏳ Processing...</div>
) : (
  <button onClick={handleImport}>Import Users</button>
)}
```

### Timeout Handling

Backend may timeout for very large files (>30 seconds):

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 sec

try {
  const response = await fetch(url, {
    signal: controller.signal,
    ...options
  });
} catch (error) {
  if (error.name === 'AbortError') {
    toast.error('Import timed out. Please try with a smaller file.');
  }
} finally {
  clearTimeout(timeoutId);
}
```

---

## Testing Checklist

### Unit Tests

- [ ] File validation (type, size)
- [ ] API request formation (FormData, headers)
- [ ] Error handling (401, 403, 400, 413, 500)
- [ ] Response parsing (success, validation errors)

### Integration Tests

- [ ] Download CSV template
- [ ] Download Excel template
- [ ] Upload valid CSV file
- [ ] Upload valid Excel file
- [ ] Upload invalid file type → Error
- [ ] Upload oversized file → Error
- [ ] Dry-run validation → Success
- [ ] Dry-run validation → Errors displayed
- [ ] Real import → Users created
- [ ] Real import → Validation errors prevent creation
- [ ] Non-admin access → 403 error

### Manual Testing

**Happy Path:**
1. Download template (CSV and Excel)
2. Fill with 10 valid users
3. Upload and validate (dry-run) → Success
4. Upload and import → 10 users created
5. Verify users appear in user list
6. Verify invitation emails sent (if configured)

**Error Cases:**
1. Upload .txt file → File type error
2. Upload 15MB file → Size error
3. Upload file with invalid emails → Validation errors shown
4. Upload file with duplicate emails → Validation errors shown
5. Upload file with non-existent manager → Validation errors shown
6. Try to import as non-admin → 403 error
7. Try to import with expired session → 401 error

---

## Security Notes

### Session Management

- Always send session token in Authorization header
- Handle 401 errors by redirecting to login
- Don't store sensitive data in localStorage

### File Upload Security

- Validate file type on client (UX) and backend (security)
- Limit file size to prevent DoS
- Don't execute or render uploaded files directly
- Files are processed server-side only

### Data Privacy

- Import files may contain PII (names, emails, phones)
- Don't log file contents
- Clear file from memory after upload
- Use HTTPS in production

---

## FAQ

### Q: What happens if a user email already exists?

**A:** If the email exists globally but not in this tenant, the user will be added to the tenant with a new membership. If the email already exists in this tenant, a validation error will be returned.

### Q: Can I update existing users with bulk import?

**A:** No, the current version only supports creating new users or adding existing users to the tenant. Update functionality may be added in a future version.

### Q: How do I know if the import will succeed before committing?

**A:** Use the "Validate Only" button (dry-run mode). This will check all rows for errors without creating any users.

### Q: What happens if validation fails partway through?

**A:** The backend validates ALL rows before creating ANY users. If even one row has errors, no users will be created, and all errors will be returned.

### Q: Are invitation emails sent automatically?

**A:** Yes, invitation emails are sent to all imported users (matching the behavior of single user creation). Users will receive a link to set their password.

### Q: Can I import users without sending invitations?

**A:** Not in the current version. All imported users receive invitations. This may be configurable in a future version.

### Q: What's the maximum number of users I can import at once?

**A:** The file size limit is 10MB, which typically supports 1000-2000 users depending on the amount of profile data. For larger imports, split into multiple files.

### Q: Can managers use bulk import?

**A:** No, bulk import is admin-only in the current version.

### Q: What if my CSV uses semicolons instead of commas?

**A:** The backend expects standard comma-separated CSV. If you have a semicolon-separated file, open it in Excel and save as CSV (Comma delimited).

---

## Example Files

### valid-users.csv
```csv
email,name,role,jobTitle,startDate,managerEmail,location,phone
alice@example.com,Alice Admin,admin,CTO,2025-01-01,,Remote,+1-555-0001
bob@example.com,Bob Manager,manager,Engineering Manager,2025-01-05,alice@example.com,San Francisco,+1-555-0002
charlie@example.com,Charlie Dev,employee,Senior Engineer,2025-01-10,bob@example.com,San Francisco,+1-555-0003
diana@example.com,Diana Dev,employee,Software Engineer,2025-01-15,bob@example.com,New York,+1-555-0004
```

### invalid-users.csv
```csv
email,name,role,jobTitle,startDate,managerEmail,location,phone
invalid-email,John Doe,employee,Engineer,2025-01-15,boss@example.com,NYC,123
jane@example.com,Jane Smith,owner,Manager,2025-01-10,,SF,456
duplicate@example.com,User 1,employee,Dev,2025-01-01,,LA,789
duplicate@example.com,User 2,employee,Dev,2025-01-01,,LA,789
```

---

## Support & Troubleshooting

### Common Issues

**Issue: "Invalid file type" error**
- Solution: Ensure file is .csv or .xlsx format, not .xls, .txt, or .numbers

**Issue: "File size exceeds limit"**
- Solution: Split file into multiple smaller files (<10MB each)

**Issue: "Manager not found" errors**
- Solution: Ensure manager is imported first, or already exists in tenant

**Issue: "User already exists in tenant"**
- Solution: Remove duplicate email from import file

**Issue: Import button is disabled**
- Solution: Ensure file is selected and you have admin role

---

## Changelog

### Version 1.0 (MVP)
- ✅ CSV and Excel file upload
- ✅ Dry-run validation mode
- ✅ Template download (CSV and Excel)
- ✅ Error reporting with row numbers
- ✅ Admin-only access
- ✅ Manager email resolution
- ✅ Invitation emails sent

### Future Enhancements
- ⏳ Async processing for large files (>1000 users)
- ⏳ Update existing users mode
- ⏳ Import history and retry
- ⏳ Downloadable error report (CSV)
- ⏳ Custom field mapping UI
- ⏳ Progress bar for imports
- ⏳ Email notification on completion

---

**End of Frontend Guide**

For backend specification, see [BULK_USER_IMPORT_SPEC.md](./BULK_USER_IMPORT_SPEC.md)
