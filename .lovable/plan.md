

# Password Reset Flow

## Overview

Add a "Forgot Password" link to the Auth page and a dedicated `/reset-password` page where users set a new password after clicking the email link.

## What Changes

### 1. Auth page (`src/pages/Auth.tsx`)

- Add a "Forgot password?" link visible only in Sign In mode
- Add a `forgotPassword` view state that shows an email-only form
- That form calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
- Shows a toast confirming the reset email was sent
- Includes a "Back to Sign In" link

### 2. New page: `src/pages/ResetPassword.tsx`

- Listens for `SIGNED_IN` or `PASSWORD_RECOVERY` event via `onAuthStateChange`
- Shows a simple "New Password" + "Confirm Password" form
- Calls `supabase.auth.updateUser({ password })` to save the new password
- On success, shows a toast and redirects to the dashboard
- This is a public route (no auth guard)

### 3. Router (`src/App.tsx`)

- Add `<Route path="/reset-password" element={<ResetPassword />} />` as a public route

## Technical Notes

- No database changes required -- password reset is handled entirely by the authentication system's built-in email flow
- The reset email uses the default authentication email template (can be customized later with branded templates)
- The `/reset-password` route must remain outside `ProtectedRoute` since the user arrives unauthenticated via an email link

