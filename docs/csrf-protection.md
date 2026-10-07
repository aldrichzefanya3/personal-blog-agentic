# CSRF Protection Implementation

## Overview

This document describes the CSRF (Cross-Site Request Forgery) protection implementation for the personal blog platform.

**Requirements**: 15.6, 15.7

## Architecture

### Server Actions (Built-in Protection)

Next.js Server Actions have **automatic CSRF protection** via Origin header verification. No custom CSRF tokens are needed for Server Actions.

See `src/actions/README.md` for details.

### Route Handlers (Custom Token Required)

Route Handlers that handle state-mutating requests (POST, PUT, PATCH, DELETE) require explicit CSRF token verification.

## Implementation Components

### 1. Server-Side Token Management (`src/lib/csrf.ts`)

#### `generateCsrfToken(): Promise<string>`
- Generates a cryptographically secure random token (32 bytes, hex-encoded)
- Stores the token in a non-HttpOnly cookie named `csrf_token`
- Cookie settings:
  - `httpOnly: false` (allows client-side JavaScript to read it)
  - `secure: true` in production (HTTPS only)
  - `sameSite: 'strict'` (additional CSRF protection)
  - `maxAge: 24 hours` (matches session duration)

#### `getCsrfToken(): Promise<string>`
- Returns existing token from cookie, or generates a new one if absent
- Safe to call multiple times (idempotent)

#### `verifyCsrfToken(request: NextRequest): Promise<boolean>`
- Verifies submitted token against cookie token
- Accepts token in:
  1. `x-csrf-token` request header (preferred)
  2. `csrf_token` request body field (JSON, FormData, or URL-encoded)
- Uses constant-time comparison to prevent timing attacks
- Returns `true` if valid, `false` otherwise

#### `clearCsrfToken(): Promise<void>`
- Removes the CSRF token cookie
- Called during logout to invalidate tokens

### 2. Token Initialization (`src/lib/csrf-init.ts`)

#### `initializeCsrfToken(): Promise<string>`
- Server Component helper that ensures a token exists
- Called in admin layout to set up token before page renders

### 3. Client-Side Utilities (`src/lib/csrf-client.ts`)

#### `getCsrfTokenFromCookie(): string | null`
- Reads the CSRF token from the cookie (client-side only)
- Returns token value or null if not found

#### `withCsrfToken(options?: RequestInit): RequestInit`
- Helper that adds CSRF token header to fetch options
- Use with API calls:
  ```typescript
  const response = await fetch('/api/preview', withCsrfToken({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown: '# Hello' })
  }));
  ```

#### `addCsrfTokenToFormData(formData: FormData): FormData`
- Appends CSRF token to FormData
- Use with form submissions:
  ```typescript
  const formData = new FormData();
  formData.append('data', 'value');
  addCsrfTokenToFormData(formData);
  
  await fetch('/api/endpoint', {
    method: 'POST',
    body: formData
  });
  ```

## Usage Examples

### Protecting a Route Handler

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { verifyCsrfToken } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  // 1. Require authenticated session
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Verify CSRF token (Req 15.6, 15.7)
  const isValidCsrf = await verifyCsrfToken(request);
  if (!isValidCsrf) {
    return NextResponse.json(
      { error: 'CSRF validation failure' },
      { status: 403 }
    );
  }

  // 3. Process the request
  // ...
}
```

### Client-Side API Call

```typescript
// In a Client Component
'use client';

import { withCsrfToken } from '@/lib/csrf-client';

export function ExampleComponent() {
  async function handleSubmit(data: Record<string, unknown>) {
    const response = await fetch('/api/example', withCsrfToken({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }));

    if (response.status === 403) {
      console.error('CSRF validation failed');
      return;
    }

    // Handle response...
  }

  return <button onClick={() => handleSubmit({ key: 'value' })}>Submit</button>;
}
```

### Form Submission with FormData

```typescript
'use client';

import { addCsrfTokenToFormData } from '@/lib/csrf-client';

export function FileUploadForm() {
  async function handleUpload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add CSRF token
    addCsrfTokenToFormData(formData);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    // Handle response...
  }

  return <input type="file" onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }} />;
}
```

## Token Lifecycle

1. **Generation**: Token is generated when an authenticated user accesses an admin page
   - Admin layout calls `initializeCsrfToken()` on every render
   - Token is stored in a non-HttpOnly cookie

2. **Submission**: Client-side code reads token from cookie and includes it in requests
   - Use `withCsrfToken()` for fetch calls
   - Use `addCsrfTokenToFormData()` for form submissions

3. **Verification**: Server-side Route Handlers verify the token
   - Call `verifyCsrfToken(request)` before processing the request
   - Return HTTP 403 with "CSRF validation failure" if invalid

4. **Invalidation**: Token is cleared when the user logs out
   - `logoutAction()` calls `clearCsrfToken()`

## Security Properties

### Defense in Depth

1. **Same-Origin Policy**: Token can only be read by JavaScript from the same origin
2. **SameSite Cookie**: Browser prevents sending cookie with cross-site requests
3. **HTTPS**: Secure flag ensures token is only transmitted over HTTPS in production
4. **Timing-Safe Comparison**: Uses `crypto.timingSafeEqual` to prevent timing attacks

### Attack Resistance

- **Cross-Site Request Forgery**: Attacker cannot read the token due to same-origin policy
- **Session Hijacking**: Token is per-session and cleared on logout
- **Timing Attacks**: Constant-time comparison prevents timing-based token extraction

## Testing

Unit tests are provided in `src/lib/csrf.test.ts` covering:

- Token generation (hex format, randomness)
- Token verification (header, JSON body, FormData)
- Rejection cases (missing token, mismatched token, invalid format)
- Edge cases (no cookie, invalid hex, empty values)

Run tests:
```bash
npm test csrf.test.ts
```

## Integration with Existing Code

### Modified Files

1. **`src/app/api/preview/route.ts`**
   - Added CSRF verification to POST handler
   - Returns 403 with "CSRF validation failure" if token is invalid

2. **`src/app/(admin)/layout.tsx`**
   - Calls `initializeCsrfToken()` to set up token for admin pages

3. **`src/actions/auth.ts`**
   - `logoutAction()` now clears CSRF token cookie

### New Files

1. **`src/actions/README.md`** - Documents Server Actions CSRF protection
2. **`src/lib/csrf.ts`** - Core CSRF token generation and verification
3. **`src/lib/csrf-init.ts`** - Server Component token initialization helper
4. **`src/lib/csrf-client.ts`** - Client-side token reading and submission helpers
5. **`src/lib/csrf.test.ts`** - Unit tests for CSRF utilities
6. **`docs/csrf-protection.md`** - This documentation file

## Future Route Handlers

Any new Route Handler that handles state-mutating requests MUST:

1. Verify the session with `getServerSession()`
2. Verify the CSRF token with `verifyCsrfToken(request)`
3. Return HTTP 403 with `{ error: 'CSRF validation failure' }` if verification fails

Client-side code calling these handlers MUST include the CSRF token using:
- `withCsrfToken()` for fetch API calls
- `addCsrfTokenToFormData()` for FormData submissions

## References

- Requirements: 15.6 (token generation), 15.7 (token verification, 403 on failure)
- Design: Security Headers and CSRF Protection section
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
