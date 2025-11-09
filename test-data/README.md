# Test Data - Bulk User Import

Sample CSV files for testing the bulk user import feature.

## Files

### `valid-users.csv`
Contains 10 valid users with proper formatting:
- 1 admin (Alice)
- 2 managers (Bob, Helen)
- 7 employees (Charlie, Diana, Edward, Fiona, George, Ivan, Julia)
- Manager hierarchy: Alice → Bob → Employees, Alice → Helen → Employees
- All fields properly formatted

**Use for:**
- Testing successful import
- Testing dry-run validation
- Testing manager relationships

### `invalid-users.csv`
Contains 7 rows with various validation errors:
1. Invalid email format (`invalid-email`)
2. Invalid role (`owner` instead of admin/manager/employee)
3-4. Duplicate emails (`duplicate@example.com` appears twice)
5. Missing required field (role)
6. Invalid date format (`01/15/2025` instead of `2025-01-15`)
7. Non-existent manager email

**Use for:**
- Testing validation error handling
- Testing error reporting with row numbers
- Testing duplicate detection

## Testing Instructions

### 1. Download Template
```bash
curl -X GET 'http://localhost:3000/api/v1/users/import/template?format=csv' \
  -H 'Authorization: Bearer <session-token>' \
  -o template.csv
```

### 2. Dry-Run Validation (Valid File)
```bash
curl -X POST 'http://localhost:3000/api/v1/users/import?dryRun=true' \
  -H 'Authorization: Bearer <session-token>' \
  -F 'file=@test-data/valid-users.csv'
```

**Expected Result:**
```json
{
  "success": true,
  "dryRun": true,
  "totalRows": 10,
  "validRows": 10,
  "errorCount": 0,
  "message": "Validation successful. All 10 users are valid and ready to import."
}
```

### 3. Dry-Run Validation (Invalid File)
```bash
curl -X POST 'http://localhost:3000/api/v1/users/import?dryRun=true' \
  -H 'Authorization: Bearer <session-token>' \
  -F 'file=@test-data/invalid-users.csv'
```

**Expected Result:**
```json
{
  "success": false,
  "dryRun": true,
  "totalRows": 7,
  "validRows": 0,
  "errorCount": 7,
  "errors": [
    {
      "row": 1,
      "email": "invalid-email",
      "errors": ["email: Invalid email"]
    },
    {
      "row": 2,
      "email": "jane@example.com",
      "errors": ["role: Invalid enum value"]
    },
    ...
  ]
}
```

### 4. Real Import (Valid File)
**⚠️ WARNING: This will create actual users in the database!**

```bash
curl -X POST 'http://localhost:3000/api/v1/users/import' \
  -H 'Authorization: Bearer <session-token>' \
  -F 'file=@test-data/valid-users.csv'
```

**Expected Result:**
```json
{
  "success": true,
  "dryRun": false,
  "totalRows": 10,
  "validRows": 10,
  "errorCount": 0,
  "createdCount": 10,
  "existingCount": 0,
  "message": "Successfully imported 10 new users and added 0 existing users to tenant.",
  "createdUsers": [...]
}
```

### 5. Check Audit Logs

After import, verify audit logs were created:

```sql
SELECT * FROM audit_logs
WHERE action = 'bulk_user_import'
ORDER BY created_at DESC
LIMIT 5;
```

## Notes

- All test files use `@example.com` domain to avoid real email conflicts
- Phone numbers use the format `+1-555-0XXX` (fictional numbers)
- Dates are in `YYYY-MM-DD` format (ISO 8601)
- Manager emails must exist before importing employees that report to them
  - Import order: Alice (admin) → Bob/Helen (managers) → Other employees
- For testing existing users: Run import twice - second time should detect duplicates

## Cleanup

To remove test users after testing:

```sql
-- Find test users
SELECT id, email FROM users WHERE email LIKE '%@example.com';

-- Delete memberships (will cascade to profiles, invitations)
DELETE FROM memberships WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@example.com'
);

-- Delete users
DELETE FROM users WHERE email LIKE '%@example.com';
```
