# Password Reset System - Frontend Implementation Guide

**Version:** 1.0
**Date:** 2025-11-14
**For:** Frontend Team

---

## Overview

This guide provides complete specifications for implementing password reset functionality in the frontend application. The backend implements **Plan 2: Full Self-Service with Token-Based Reset** with three main features:

1. **Change Password** - Authenticated users can change their password
2. **Forgot Password** - Public users can request password reset
3. **Reset Password** - Users can reset password using token

---

## Table of Contents

- [API Endpoints Summary](#api-endpoints-summary)
- [User Flows & UX](#user-flows--ux)
- [Component Specifications](#component-specifications)
- [API Integration](#api-integration)
- [Validation & Error Handling](#validation--error-handling)
- [State Management](#state-management)
- [Security Considerations](#security-considerations)
- [POC vs Production Mode](#poc-vs-production-mode)

---

## API Endpoints Summary

### Base URL
```
http://localhost:3000/api/v1/auth
```

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/change-password` | ✅ Required | Change password for logged-in user |
| POST | `/forgot-password` | ❌ Public | Request password reset token |
| POST | `/reset-password` | ❌ Public | Reset password with token |
| GET | `/admin/password-reset-tokens` | ✅ Admin only | Get active tokens (POC mode) |

---

## User Flows & UX

### Flow 1: Change Password (Settings Page)

**User Journey:**
```
User is logged in → Settings page → Change Password section →
Enter current password → Enter new password → Confirm new password →
Submit → All sessions invalidated → Redirect to login
```

**UX Requirements:**

1. **Location:** User settings/profile page
2. **Form Layout:**
   - Current Password (password field, required)
   - New Password (password field, required, min 8 chars)
   - Confirm New Password (password field, required, must match)
   - Submit button

3. **Visual Feedback:**
   - Show password strength indicator for new password
   - Show/hide password toggle for all fields
   - Disable submit until form is valid
   - Loading state during API call

4. **Success Flow:**
   - Show success toast: "Password changed successfully"
   - Display modal: "Your password has been changed. You'll be logged out for security."
   - Wait 2 seconds
   - Clear all session data
   - Redirect to login page
   - Show pre-filled email (optional)

5. **Error Handling:**
   - 401 Unauthorized: "Current password is incorrect"
   - 400 Bad Request: "New password must be different from current password"
   - Network error: "Unable to change password. Please try again."

**Wireframe:**
```
┌─────────────────────────────────────┐
│ Settings > Security                 │
├─────────────────────────────────────┤
│ Change Password                     │
│                                     │
│ Current Password                    │
│ [••••••••••]              [👁️ Show] │
│                                     │
│ New Password                        │
│ [••••••••••]              [👁️ Show] │
│ ━━━━━━━━━━━━━━━━━━ Strong          │
│                                     │
│ Confirm New Password                │
│ [••••••••••]              [👁️ Show] │
│ ✓ Passwords match                   │
│                                     │
│            [Change Password]        │
└─────────────────────────────────────┘
```

---

### Flow 2: Forgot Password (Login Page)

**User Journey:**
```
Login page → "Forgot password?" link → Forgot password page →
Enter email → Submit → Success message →
(POC: Admin sends link manually) →
User receives reset link → Click link → Reset password page
```

**UX Requirements:**

1. **Entry Point:** Link below login form: "Forgot your password?"

2. **Forgot Password Page:**
   - Page title: "Reset your password"
   - Subtitle: "Enter your email and we'll send you a link to reset your password"
   - Email input field (required, email validation)
   - Submit button: "Send reset link"
   - Back to login link

3. **Visual Feedback:**
   - Disable submit until email is valid
   - Loading state during API call
   - Rate limit message if applicable

4. **Success Flow:**
   - Show success message (always, even if email doesn't exist - security)
   - Message: "If an account exists with this email, you'll receive a password reset link shortly."
   - Show "Didn't receive email?" helper with troubleshooting tips
   - Provide "Back to login" button

5. **POC Mode Notice (Optional):**
   - Show info banner: "For MVP: Please contact your administrator to receive the reset link."

6. **Error Handling:**
   - 400 Bad Request: "Please enter a valid email address"
   - 429 Too Many Requests: "Too many reset attempts. Please try again in 1 hour."
   - Network error: "Unable to send reset link. Please try again."

**Wireframe:**
```
┌─────────────────────────────────────┐
│ ← Back to login                     │
│                                     │
│    🔐 Reset your password           │
│                                     │
│ Enter your email and we'll send you │
│ a link to reset your password       │
│                                     │
│ Email Address                       │
│ [email@example.com            ]     │
│                                     │
│         [Send Reset Link]           │
│                                     │
│ Didn't receive email?               │
│ • Check your spam folder            │
│ • Verify email is correct           │
│ • Contact support                   │
└─────────────────────────────────────┘
```

---

### Flow 3: Reset Password (Public Page)

**User Journey:**
```
Click reset link from email/admin →
Reset password page (token in URL) →
Enter new password → Confirm password →
Submit → Success message → Redirect to login
```

**UX Requirements:**

1. **URL Format:**
   ```
   /reset-password?token=abc-123-xyz-789
   ```

2. **Page Load:**
   - Extract token from URL query params
   - Validate token format (UUID)
   - If no token or invalid format: Show error, redirect to login
   - Show page title: "Create new password"

3. **Form Layout:**
   - New Password (password field, required, min 8 chars)
   - Confirm Password (password field, required, must match)
   - Submit button: "Reset password"
   - Hidden field: token (from URL)

4. **Visual Feedback:**
   - Show password strength indicator
   - Show/hide password toggle
   - Real-time password match validation
   - Disable submit until form is valid
   - Loading state during API call

5. **Success Flow:**
   - Show success message: "Password reset successfully!"
   - Display modal: "You can now log in with your new password."
   - Wait 2 seconds
   - Redirect to login page
   - Show pre-filled email (if available from token)

6. **Error Handling:**
   - 400 Bad Request (invalid token): "This reset link is invalid or has expired. Please request a new one."
   - 400 Bad Request (token used): "This reset link has already been used. Please request a new one."
   - 400 Bad Request (token expired): "This reset link has expired. Please request a new one."
   - Network error: "Unable to reset password. Please try again."
   - All errors: Show "Request new reset link" button

**Wireframe:**
```
┌─────────────────────────────────────┐
│    🔐 Create new password           │
│                                     │
│ Choose a strong password for your   │
│ account                             │
│                                     │
│ New Password                        │
│ [••••••••••]              [👁️ Show] │
│ ━━━━━━━━━━━━━━━━━━ Strong          │
│                                     │
│ • At least 8 characters             │
│ • Mix of letters and numbers        │
│ • Include special characters        │
│                                     │
│ Confirm Password                    │
│ [••••••••••]              [👁️ Show] │
│ ✓ Passwords match                   │
│                                     │
│         [Reset Password]            │
└─────────────────────────────────────┘
```

---

### Flow 4: Admin Token Retrieval (POC Mode)

**User Journey (Admin only):**
```
Admin dashboard → Password Reset Tokens page →
View list of active tokens → Copy reset link →
Send to user via email/Slack/etc.
```

**UX Requirements:**

1. **Location:** Admin panel / Tools section

2. **Page Layout:**
   - Page title: "Password Reset Tokens (POC Mode)"
   - Info banner: "During POC, manually send these links to users who request password resets."
   - Table of active tokens:
     - Email
     - Reset Link (with copy button)
     - Expires At (with countdown)
     - Created At

3. **Features:**
   - Copy link button (with toast: "Link copied!")
   - Auto-refresh every 30 seconds
   - Filter/search by email
   - Show only non-expired tokens
   - Empty state: "No active reset tokens"

4. **Visual Feedback:**
   - Highlight tokens expiring soon (< 5 minutes)
   - Show countdown timer for expiry
   - Disable copy for expired tokens

**Wireframe:**
```
┌─────────────────────────────────────────────────────┐
│ Password Reset Tokens                               │
├─────────────────────────────────────────────────────┤
│ ℹ️  POC Mode: Manually send these links to users    │
└─────────────────────────────────────────────────────┘
│ Search: [email@example.com          ] [🔍 Search]  │
├─────────────────────────────────────────────────────┤
│ Email              │ Reset Link      │ Expires      │
├────────────────────┼─────────────────┼──────────────┤
│ user@example.com   │ [📋 Copy Link]  │ 12m 45s      │
│ john@company.com   │ [📋 Copy Link]  │ 8m 20s       │
│ jane@startup.com   │ [📋 Copy Link]  │ 2m 10s ⚠️    │
└─────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. ChangePasswordForm Component

**Props:**
```typescript
interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}
```

**State:**
```typescript
interface FormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isLoading: boolean;
  error: string | null;
}
```

**Validation Rules:**
- Current password: Required
- New password: Min 8 chars, max 128 chars
- Confirm password: Must match new password
- New password must be different from current

**Example (React):**
```tsx
import { useState } from 'react';
import { changePassword } from './api/auth';

export function ChangePasswordForm({ onSuccess, onError }: ChangePasswordFormProps) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      // Show success message
      alert('Password changed successfully. You will be logged out.');

      // Clear session
      localStorage.clear();

      // Redirect to login
      window.location.href = '/login';

      onSuccess?.();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to change password';
      setError(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields implementation */}
    </form>
  );
}
```

---

### 2. ForgotPasswordForm Component

**Props:**
```typescript
interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}
```

**State:**
```typescript
interface FormState {
  email: string;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}
```

**Validation Rules:**
- Email: Required, valid email format

**Example (React):**
```tsx
import { useState } from 'react';
import { forgotPassword } from './api/auth';

export function ForgotPasswordForm({ onSuccess, onError }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await forgotPassword({ email: email.toLowerCase() });
      setIsSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to send reset link';
      setError(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="success-message">
        <h2>Check your email</h2>
        <p>
          If an account exists with {email}, you'll receive a password reset link shortly.
        </p>
        <button onClick={() => window.location.href = '/login'}>
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields implementation */}
    </form>
  );
}
```

---

### 3. ResetPasswordForm Component

**Props:**
```typescript
interface ResetPasswordFormProps {
  token: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}
```

**State:**
```typescript
interface FormState {
  newPassword: string;
  confirmPassword: string;
  isLoading: boolean;
  error: string | null;
}
```

**Validation Rules:**
- New password: Min 8 chars, max 128 chars
- Confirm password: Must match new password

**Example (React):**
```tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { resetPassword } from './api/auth';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate token exists and is UUID format
    if (!token || !isValidUUID(token)) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      await resetPassword({
        token,
        newPassword: formData.newPassword,
      });

      // Show success and redirect
      alert('Password reset successfully! You can now log in.');
      window.location.href = '/login';
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to reset password';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields implementation */}
    </form>
  );
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
```

---

### 4. PasswordStrengthIndicator Component

**Props:**
```typescript
interface PasswordStrengthIndicatorProps {
  password: string;
}
```

**Implementation:**
```tsx
export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = calculatePasswordStrength(password);

  const colors = {
    weak: 'red',
    fair: 'orange',
    good: 'yellow',
    strong: 'green',
  };

  return (
    <div className="password-strength">
      <div className="strength-bar">
        <div
          className={`strength-fill ${strength.level}`}
          style={{ width: `${strength.score}%`, backgroundColor: colors[strength.level] }}
        />
      </div>
      <span className="strength-label">{strength.label}</span>
    </div>
  );
}

function calculatePasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 20;
  if (/\d/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;

  let level: 'weak' | 'fair' | 'good' | 'strong';
  let label: string;

  if (score < 40) {
    level = 'weak';
    label = 'Weak';
  } else if (score < 60) {
    level = 'fair';
    label = 'Fair';
  } else if (score < 80) {
    level = 'good';
    label = 'Good';
  } else {
    level = 'strong';
    label = 'Strong';
  }

  return { score, level, label };
}
```

---

## API Integration

### API Client Setup

**Base Configuration:**
```typescript
// api/config.ts
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('sessionToken');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token && !endpoint.includes('login') && !endpoint.includes('signup')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}
```

### Auth API Functions

```typescript
// api/auth.ts
import { apiRequest, API_BASE_URL } from './config';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  await apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<void> {
  await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getActiveResetTokens() {
  return apiRequest<{ data: Array<{
    email: string;
    resetLink: string;
    expiresAt: string;
    createdAt: string;
  }> }>('/auth/admin/password-reset-tokens');
}
```

---

## Validation & Error Handling

### Client-Side Validation

**Password Validation:**
```typescript
export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password must not exceed 128 characters';
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (password !== confirm) return 'Passwords do not match';
  return null;
}
```

**Email Validation:**
```typescript
export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';

  return null;
}
```

### Error Message Mapping

```typescript
export function mapApiError(error: any): string {
  const status = error.response?.status;
  const message = error.response?.data?.message;

  // Change password errors
  if (status === 401 && message?.includes('Current password')) {
    return 'Your current password is incorrect. Please try again.';
  }
  if (status === 400 && message?.includes('must be different')) {
    return 'Your new password must be different from your current password.';
  }

  // Forgot password errors
  if (status === 429) {
    return 'Too many reset attempts. Please try again in 1 hour.';
  }

  // Reset password errors
  if (status === 400 && message?.includes('expired')) {
    return 'This reset link has expired. Please request a new one.';
  }
  if (status === 400 && message?.includes('already been used')) {
    return 'This reset link has already been used. Please request a new one.';
  }
  if (status === 400 && message?.includes('Invalid')) {
    return 'This reset link is invalid. Please request a new one.';
  }

  // Generic errors
  if (status >= 500) {
    return 'Server error. Please try again later.';
  }

  return message || 'An unexpected error occurred. Please try again.';
}
```

---

## State Management

### Using React Context (Example)

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState } from 'react';

interface AuthContextType {
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await changePasswordAPI({ currentPassword, newPassword });
      // Clear session and redirect
      localStorage.clear();
      window.location.href = '/login';
    } catch (err: any) {
      setError(mapApiError(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Similar for forgotPassword and resetPassword...

  return (
    <AuthContext.Provider value={{ changePassword, forgotPassword, resetPassword, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

---

## Security Considerations

### 1. Token Handling

**DO:**
- ✅ Extract token from URL on page load
- ✅ Validate token format (UUID) before making API call
- ✅ Clear token from URL after successful reset (replace history state)
- ✅ Show generic error messages (don't reveal if email exists)

**DON'T:**
- ❌ Store reset token in localStorage/sessionStorage
- ❌ Expose token in console logs
- ❌ Allow token to be reused
- ❌ Reveal if email exists in system

### 2. Password Security

**DO:**
- ✅ Use `type="password"` for all password inputs
- ✅ Implement show/hide password toggle
- ✅ Validate password strength client-side
- ✅ Clear password fields on error
- ✅ Disable autocomplete for password fields (optional)

**DON'T:**
- ❌ Store passwords in state longer than necessary
- ❌ Log passwords to console
- ❌ Send passwords in URL params
- ❌ Display passwords in error messages

### 3. Session Management

**After Password Change/Reset:**
```typescript
// Clear all session data
localStorage.removeItem('sessionToken');
localStorage.removeItem('refreshToken');
localStorage.removeItem('userId');
localStorage.removeItem('tenantId');
localStorage.removeItem('userRole');

// Or clear everything
localStorage.clear();

// Redirect to login
window.location.href = '/login';
```

---

## POC vs Production Mode

### POC Mode (Current)

**How it works:**
1. User requests password reset
2. Token generated and logged to server console
3. Admin retrieves token from logs or admin endpoint
4. Admin manually sends reset link to user
5. User uses link to reset password

**Frontend differences:**
- Show notice: "Contact admin for reset link" (optional)
- Admin-only page to view active tokens
- Copy reset link functionality

### Production Mode (Future)

**How it works:**
1. User requests password reset
2. Token generated and email sent automatically
3. User receives email with reset link
4. User uses link to reset password

**Frontend changes needed:**
- Remove POC notice
- Remove admin token retrieval page (optional)
- Update success message to mention email

**No other changes required** - All forms and flows remain the same!

---

## Routing Setup

### Recommended Routes

```typescript
// React Router example
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/admin/password-tokens" element={<AdminRoute><PasswordTokensPage /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Testing Checklist

### Manual Testing

**Change Password:**
- [ ] Can submit with valid current + new password
- [ ] Error shown if current password is wrong
- [ ] Error shown if new password same as current
- [ ] Error shown if passwords don't match
- [ ] User logged out after successful change
- [ ] All sessions invalidated (test on multiple devices)

**Forgot Password:**
- [ ] Can submit with valid email
- [ ] Success message shown (even for non-existent email)
- [ ] Rate limit enforced (3 attempts/hour)
- [ ] Can click "Back to login"

**Reset Password:**
- [ ] Can access page with valid token in URL
- [ ] Error shown if no token in URL
- [ ] Can submit with matching passwords
- [ ] Success message shown after reset
- [ ] Redirect to login works
- [ ] Cannot reuse token (shows error)
- [ ] Expired token shows error

**Admin Token Page (POC):**
- [ ] Only accessible by admin users
- [ ] Shows list of active tokens
- [ ] Can copy reset link
- [ ] Countdown timer works
- [ ] Auto-refresh works

### Automated Testing

```typescript
// Example: Vitest/Jest + React Testing Library

describe('ChangePasswordForm', () => {
  it('validates passwords match', () => {
    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'Different123' },
    });

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('calls API on valid submission', async () => {
    const mockChangePassword = vi.fn();
    render(<ChangePasswordForm onChangePassword={mockChangePassword} />);

    // Fill form...
    fireEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'old',
        newPassword: 'new',
      });
    });
  });
});
```

---

## Accessibility (a11y)

### Requirements

1. **Keyboard Navigation:**
   - All forms navigable with Tab
   - Submit with Enter key
   - Show/hide password toggle with Space

2. **Screen Reader Support:**
   - Label all inputs properly
   - Announce validation errors
   - Announce success messages
   - Use ARIA live regions for dynamic content

3. **Form Labels:**
   ```html
   <label htmlFor="current-password">Current Password</label>
   <input
     id="current-password"
     type="password"
     aria-required="true"
     aria-invalid={!!error}
     aria-describedby="password-error"
   />
   {error && <span id="password-error" role="alert">{error}</span>}
   ```

4. **Focus Management:**
   - Focus on first input on page load
   - Focus on error message when validation fails
   - Focus on success message after submission

---

## Design System Integration

### Recommended Components

Use existing design system components:
- `Input` - For password/email fields
- `Button` - For submit buttons
- `Alert` - For error messages
- `Toast` - For success notifications
- `Modal` - For confirmation dialogs
- `ProgressBar` - For password strength
- `Link` - For navigation links

### Theming

Ensure components respect theme:
- Light/dark mode
- Brand colors
- Consistent spacing
- Responsive breakpoints

---

## Mobile Considerations

1. **Touch Targets:**
   - Buttons min 44x44px
   - Show/hide password toggle large enough

2. **Virtual Keyboard:**
   - Use `type="email"` for email inputs
   - Use `type="password"` for password inputs
   - Consider `autocomplete` attributes

3. **Responsive Design:**
   - Forms stack vertically on mobile
   - Full-width inputs and buttons
   - Adequate spacing between fields

4. **Loading States:**
   - Show spinner during API calls
   - Disable buttons while loading
   - Prevent double submission

---

## Performance Optimization

1. **Code Splitting:**
   ```typescript
   // Lazy load password reset pages
   const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
   ```

2. **API Caching:**
   - Don't cache password reset requests
   - Clear any auth-related cache on logout

3. **Bundle Size:**
   - Import only needed validation libraries
   - Use tree-shaking for utilities

---

## Browser Support

Ensure compatibility with:
- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android 10+)

---

## Summary Checklist

**Before Starting Development:**
- [ ] Review all user flows
- [ ] Understand POC vs production differences
- [ ] Set up API client
- [ ] Plan component structure

**During Development:**
- [ ] Implement all 3 forms (change, forgot, reset)
- [ ] Add password strength indicator
- [ ] Implement validation
- [ ] Add error handling
- [ ] Test on multiple devices

**Before Release:**
- [ ] Manual testing complete
- [ ] Automated tests passing
- [ ] Accessibility audit done
- [ ] Design review approved
- [ ] Documentation updated

---

## Support & Questions

For backend API questions:
- See: `docs/PASSWORD_RESET_DEPLOYMENT_GUIDE.md`
- Swagger docs: `http://localhost:3000/api-docs`

For UX/design questions:
- Review wireframes in this doc
- Contact design team
- Check design system documentation

---

**End of Frontend Guide**
