# Password Reset System - Backend Deployment Guide

**Version:** 1.0
**Date:** 2025-11-14
**Status:** ✅ Production-Ready (POC Mode)

---

## Overview

This guide covers the deployment and setup of the password reset system implemented following **Plan 2: Full Self-Service with Token-Based Reset**. The system is production-ready and currently operates in **POC mode** (password reset tokens logged to console instead of sent via email).

---

## What's Been Implemented

### ✅ Completed Features

1. **POST /api/v1/auth/change-password** - Change password for authenticated users
2. **POST /api/v1/auth/forgot-password** - Request password reset token
3. **POST /api/v1/auth/reset-password** - Reset password with token
4. **GET /api/v1/auth/admin/password-reset-tokens** - Admin endpoint to retrieve active tokens (POC mode)

### 🔒 Security Features

- ✅ Tokens expire after 15 minutes
- ✅ One-time use tokens (marked as used after reset)
- ✅ Rate limiting (3 requests/hour on forgot-password)
- ✅ Email enumeration protection (always returns success message)
- ✅ All user sessions invalidated after password change/reset
- ✅ Current password verification for change-password
- ✅ Prevents reusing current password

---

## Database Changes

### New Table: `password_reset_tokens`

**Migration File:** `drizzle/migrations/0010_noisy_nightcrawler.sql`

```sql
CREATE TABLE "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "token" uuid DEFAULT gen_random_uuid() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "ip_address" varchar(45),
  CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);

-- Foreign keys
ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

-- Indexes for performance
CREATE INDEX "idx_password_reset_tokens_token"
  ON "password_reset_tokens" USING btree ("token");
CREATE INDEX "idx_password_reset_tokens_user_id"
  ON "password_reset_tokens" USING btree ("user_id");
CREATE INDEX "idx_password_reset_tokens_tenant_id"
  ON "password_reset_tokens" USING btree ("tenant_id");
```

### Schema Features

- **Tenant isolation:** Each token belongs to a specific tenant
- **Auto-cleanup:** Tokens cascade delete when user/tenant deleted
- **Performance:** Indexed on token, user_id, and tenant_id
- **Security:** Tokens are UUIDs (not sequential, hard to guess)
- **Audit trail:** IP address tracked for security monitoring

---

## Local Deployment Steps

### 1. Pull Latest Code

```bash
git checkout claude/check-password-reset-service-01Jwr2trJQr8cAQHaFooBva7
git pull origin claude/check-password-reset-service-01Jwr2trJQr8cAQHaFooBva7
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Database

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Verify database is running
docker-compose ps
```

### 4. Run Database Migration

```bash
# Apply the new migration
pnpm db:migrate

# Verify migration applied
psql $DATABASE_URL -c "\d password_reset_tokens"
```

**Expected Output:**
```
                         Table "public.password_reset_tokens"
   Column    |           Type           | Collation | Nullable |      Default
-------------+--------------------------+-----------+----------+--------------------
 id          | uuid                     |           | not null | gen_random_uuid()
 tenant_id   | uuid                     |           | not null |
 user_id     | uuid                     |           | not null |
 token       | uuid                     |           | not null | gen_random_uuid()
 expires_at  | timestamp with time zone |           | not null |
 used_at     | timestamp with time zone |           |          |
 created_at  | timestamp with time zone |           |          | now()
 ip_address  | character varying(45)    |           |          |
Indexes:
    "password_reset_tokens_pkey" PRIMARY KEY, btree (id)
    "password_reset_tokens_token_unique" UNIQUE CONSTRAINT, btree (token)
    "idx_password_reset_tokens_tenant_id" btree (tenant_id)
    "idx_password_reset_tokens_token" btree (token)
    "idx_password_reset_tokens_user_id" btree (user_id)
```

### 5. Configure Environment Variables

Add to `.env` file:

```bash
# Optional: Frontend URL for reset links (defaults to http://localhost:3000)
FRONTEND_URL=http://localhost:3000

# Existing required variables
DATABASE_URL=postgresql://user:password@localhost:5432/kairos
SESSION_SECRET=your-secret-key
PORT=3000
NODE_ENV=development
```

### 6. Build and Start Application

```bash
# Build TypeScript
pnpm build

# Start in development mode
pnpm dev

# Or start in production mode
pnpm start:prod
```

### 7. Verify Endpoints

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Check Swagger docs
open http://localhost:3000/api-docs
```

---

## Testing the Implementation

### Test 1: Change Password (Authenticated User)

```bash
# Login first to get session token
SESSION_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | jq -r '.data.token')

# Change password
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "NewPassword456!"
  }'

# Expected Response (200 OK)
{
  "message": "Password changed successfully. Please log in again."
}
```

### Test 2: Forgot Password (Public)

```bash
# Request password reset
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}'

# Expected Response (200 OK)
{
  "message": "If an account exists with this email, a password reset link will be sent."
}

# Check server logs for reset token (POC MODE)
# You should see output like:
# ======================================
# PASSWORD RESET TOKEN GENERATED (POC MODE)
# ======================================
# User: admin@example.com
# Reset Link: http://localhost:3000/reset-password?token=abc-123-xyz
# Expires: 2025-11-14T15:45:00Z
# ======================================
```

### Test 3: Reset Password with Token (Public)

```bash
# Use token from logs above
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc-123-xyz",
    "newPassword": "AnotherNewPassword789!"
  }'

# Expected Response (200 OK)
{
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

### Test 4: Admin View Active Tokens (Admin Only)

```bash
# Login as admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | jq -r '.data.token')

# Get active reset tokens
curl -X GET http://localhost:3000/api/v1/auth/admin/password-reset-tokens \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected Response (200 OK)
{
  "data": [
    {
      "email": "user@example.com",
      "resetLink": "http://localhost:3000/reset-password?token=abc-123",
      "expiresAt": "2025-11-14T15:45:00Z",
      "createdAt": "2025-11-14T15:30:00Z"
    }
  ]
}
```

---

## POC Mode Workflow

### How It Works (Current Implementation)

1. **User requests password reset**
   - Frontend: `POST /api/v1/auth/forgot-password` with email
   - Backend: Generates token, logs to console

2. **Admin retrieves reset link**
   - Admin checks server logs OR
   - Admin calls `GET /api/v1/auth/admin/password-reset-tokens`

3. **Admin sends link to user**
   - Copy reset link from logs/API response
   - Send via email, Slack, or other communication channel

4. **User resets password**
   - User clicks link → Frontend reset password page
   - Frontend: `POST /api/v1/auth/reset-password` with token + new password
   - User can now log in with new password

### Console Output Example

When a user requests password reset, the server logs:

```
[Nest] 12345  - 11/14/2025, 3:30:00 PM     LOG [AuthService] ======================================
[Nest] 12345  - 11/14/2025, 3:30:00 PM     LOG [AuthService] PASSWORD RESET TOKEN GENERATED (POC MODE)
[Nest] 12345  - 11/14/2025, 3:30:00 PM     LOG [AuthService] ======================================
[Nest] 12345  - 11/14/2025, 3:30:00 PM     LOG [AuthService] User: john.doe@example.com
[Nest] 12345  - 11/14/2025, 3:30:00 PM     LOG [AuthService] Reset Link: http://localhost:3000/reset-password?token=abc-123-xyz-789
[Nest] 12345  - 11/14/2025, 3:30:00 PM     LOG [AuthService] Expires: 2025-11-14T15:45:00.000Z
[Nest] 12345  - 11/14/2025, 3:30:00 PM     LOG [AuthService] ======================================
```

---

## Migration to Production (Email Service Integration)

### What Needs to Change

**Current (POC Mode):**
```typescript
// src/auth/auth.service.ts:418-428
this.logger.log('======================================');
this.logger.log('PASSWORD RESET TOKEN GENERATED (POC MODE)');
this.logger.log('======================================');
this.logger.log(`User: ${user.email}`);
this.logger.log(`Reset Link: ${resetLink}`);
this.logger.log(`Expires: ${expiresAt.toISOString()}`);
this.logger.log('======================================');

// TODO: Replace with email service when available
// await this.emailService.sendPasswordResetEmail(user.email, resetLink);
```

**Future (Production Mode):**
```typescript
// Remove console logging
// Add email service integration

// 1. Install email service package (e.g., @nestjs-modules/mailer, SendGrid, AWS SES)
// 2. Create email service
// 3. Replace console.log with:
await this.emailService.sendPasswordResetEmail({
  to: user.email,
  resetLink,
  expiresAt,
  userName: user.name,
});

// 4. Optional: Remove admin token retrieval endpoint
// (no longer needed when emails are automated)
```

### Email Service Integration Steps

1. **Choose Email Provider**
   - SendGrid (recommended for MVP)
   - AWS SES (cost-effective for scale)
   - Mailgun
   - Postmark

2. **Install Dependencies**
   ```bash
   pnpm add @nestjs-modules/mailer nodemailer
   pnpm add -D @types/nodemailer
   ```

3. **Create Email Service**
   ```typescript
   // src/email/email.service.ts
   import { Injectable } from '@nestjs/common';
   import { MailerService } from '@nestjs-modules/mailer';

   @Injectable()
   export class EmailService {
     constructor(private readonly mailerService: MailerService) {}

     async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
       await this.mailerService.sendMail({
         to: email,
         subject: 'Password Reset Request',
         template: 'password-reset', // HTML template
         context: {
           resetLink,
           expiresInMinutes: 15,
         },
       });
     }
   }
   ```

4. **Update auth.service.ts**
   ```typescript
   // Line 428: Replace console.log with email service
   await this.emailService.sendPasswordResetEmail(user.email, resetLink);
   ```

5. **Environment Variables**
   ```bash
   # .env
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASSWORD=your-sendgrid-api-key
   EMAIL_FROM=noreply@yourdomain.com
   ```

---

## Security Considerations

### Token Security

- ✅ **UUIDs used:** Not sequential, hard to guess
- ✅ **15-minute expiry:** Minimizes window for abuse
- ✅ **One-time use:** Token marked as used after reset
- ✅ **IP tracking:** Logged for security audit
- ✅ **Rate limiting:** 3 requests/hour prevents abuse
- ✅ **Email enumeration protection:** Always returns success

### Password Security

- ✅ **Bcrypt hashing:** 12 rounds (industry standard)
- ✅ **Minimum 8 characters:** Enforced by validation
- ✅ **Cannot reuse current password:** Checked before update
- ✅ **Session invalidation:** All sessions killed after change

### Recommended Production Additions

- [ ] Add password complexity requirements (uppercase, lowercase, number, special char)
- [ ] Add password history (prevent reusing last N passwords)
- [ ] Add failed attempt tracking (lock account after N failed resets)
- [ ] Add 2FA requirement for password reset (optional)
- [ ] Add CAPTCHA to forgot-password endpoint (prevent bots)
- [ ] Monitor for suspicious reset patterns (multiple resets in short time)

---

## Monitoring and Logging

### What's Logged

**Password Change:**
```
[AuthService] Password changed successfully for user {userId}
```

**Forgot Password:**
```
[AuthService] Password reset requested for non-existent email: {email} (security: silent fail)
[AuthService] Password reset requested for user with no active tenant: {userId}
[AuthService] PASSWORD RESET TOKEN GENERATED (POC MODE) - User: {email}
```

**Reset Password:**
```
[AuthService] Password reset successfully for user {userId}
```

### Recommended Monitoring

1. **Rate Limit Triggers**
   - Alert if user hits rate limit multiple times
   - May indicate account enumeration attempt

2. **Token Expiry Rate**
   - Track how many tokens expire without being used
   - High rate may indicate UX issues

3. **Failed Reset Attempts**
   - Log attempts with invalid/expired tokens
   - Multiple failed attempts may indicate brute force

4. **Password Reset Frequency**
   - Alert if same user resets password multiple times/day
   - May indicate compromised account

---

## Rollback Plan

If issues occur during deployment:

### 1. Rollback Code

```bash
git checkout main
pnpm install
pnpm build
pnpm start:prod
```

### 2. Rollback Database (Optional)

**⚠️ WARNING:** Only do this if absolutely necessary. This will delete all password reset tokens.

```sql
-- Drop new table
DROP TABLE IF EXISTS password_reset_tokens CASCADE;

-- Record rollback in migrations
-- (create new migration to drop table)
```

### 3. Verify Rollback

```bash
# Check health
curl http://localhost:3000/api/v1/health

# Verify existing endpoints still work
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

---

## Troubleshooting

### Issue: Migration Fails

**Error:** `relation "password_reset_tokens" already exists`

**Solution:**
```bash
# Check if table exists
psql $DATABASE_URL -c "\d password_reset_tokens"

# If exists, migration already applied
# If not, check migration status:
pnpm db:migrate
```

### Issue: Build Fails with TypeScript Errors

**Error:** `Cannot find module '@nestjs/config'`

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
pnpm build
```

### Issue: Reset Token Not Logged to Console

**Possible Causes:**
1. User email doesn't exist (security: silent fail)
2. User has no active tenant membership
3. LOG_LEVEL set too high

**Solution:**
```bash
# Set LOG_LEVEL to debug
export LOG_LEVEL=debug

# Restart server
pnpm dev

# Try forgot-password again
```

### Issue: Token Expired Error

**Error:** `Reset token has expired`

**Cause:** Token older than 15 minutes

**Solution:**
- Request new token via forgot-password
- Tokens are single-use and time-limited for security

### Issue: Admin Endpoint Returns 403 Forbidden

**Cause:** User doesn't have admin role

**Solution:**
```bash
# Verify user has admin role
psql $DATABASE_URL -c "
  SELECT u.email, m.role
  FROM users u
  JOIN memberships m ON u.id = m.user_id
  WHERE u.email = 'your-email@example.com'
"

# If not admin, update role:
psql $DATABASE_URL -c "
  UPDATE memberships
  SET role = 'admin'
  WHERE user_id = (SELECT id FROM users WHERE email = 'your-email@example.com')
"
```

---

## API Reference Summary

### Change Password (Authenticated)

**Endpoint:** `POST /api/v1/auth/change-password`
**Auth:** Required (session token)
**Rate Limit:** None
**Request:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456!"
}
```
**Response:** `200 OK`
```json
{
  "message": "Password changed successfully. Please log in again."
}
```

### Forgot Password (Public)

**Endpoint:** `POST /api/v1/auth/forgot-password`
**Auth:** None (public)
**Rate Limit:** 3 requests/hour per IP
**Request:**
```json
{
  "email": "user@example.com"
}
```
**Response:** `200 OK`
```json
{
  "message": "If an account exists with this email, a password reset link will be sent."
}
```

### Reset Password (Public)

**Endpoint:** `POST /api/v1/auth/reset-password`
**Auth:** None (public)
**Rate Limit:** None (token-based security)
**Request:**
```json
{
  "token": "uuid-token-from-email",
  "newPassword": "NewSecurePassword789!"
}
```
**Response:** `200 OK`
```json
{
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

### Get Active Tokens (Admin Only - POC)

**Endpoint:** `GET /api/v1/auth/admin/password-reset-tokens`
**Auth:** Required (admin role)
**Rate Limit:** None
**Response:** `200 OK`
```json
{
  "data": [
    {
      "email": "user@example.com",
      "resetLink": "http://localhost:3000/reset-password?token=abc-123",
      "expiresAt": "2025-11-14T15:45:00Z",
      "createdAt": "2025-11-14T15:30:00Z"
    }
  ]
}
```

---

## Files Modified/Added

### New Files

- `src/db/schema/password-reset-tokens.ts` - Database schema
- `src/auth/dto/change-password.dto.ts` - Change password DTO
- `src/auth/dto/forgot-password.dto.ts` - Forgot password DTO
- `src/auth/dto/reset-password.dto.ts` - Reset password DTO
- `drizzle/migrations/0010_noisy_nightcrawler.sql` - Database migration

### Modified Files

- `src/db/schema/index.ts` - Export new schema
- `src/auth/auth.service.ts` - Added password management methods
- `src/auth/auth.controller.ts` - Added password endpoints
- `src/auth/dto/auth-response.dto.ts` - Added response DTOs
- `src/auth/decorators/current-user.decorator.ts` - Added CurrentUserId decorator

---

## Next Steps

1. ✅ **Deploy to staging environment**
   - Apply migration
   - Test all endpoints
   - Verify POC mode works

2. ⏳ **Integrate email service** (when ready)
   - Choose provider (SendGrid recommended)
   - Create email templates
   - Replace console.log with email service
   - Test email delivery

3. ⏳ **Add frontend components**
   - Change password form
   - Forgot password form
   - Reset password page
   - See: `docs/PASSWORD_RESET_FRONTEND_GUIDE.md`

4. ⏳ **Production hardening**
   - Add password complexity validation
   - Add CAPTCHA to forgot-password
   - Set up monitoring alerts
   - Document runbook for support team

---

## Support

For questions or issues:
- Check Swagger docs: `http://localhost:3000/api-docs`
- Review server logs: `docker-compose logs -f api`
- Test with Postman collection (if available)
- Contact backend team

---

**End of Deployment Guide**
