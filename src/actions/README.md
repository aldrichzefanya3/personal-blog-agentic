# Server Actions CSRF Protection

## Built-in Next.js Server Actions Security

Next.js Server Actions have **built-in CSRF protection** via the `Origin` header check. The framework automatically enforces same-origin policy for all Server Action invocations.

### How It Works

1. **Origin Header Verification**: Next.js compares the `Origin` header of incoming Server Action requests against the server's origin. Cross-origin requests are rejected before the action function executes.

2. **Content Type Enforcement**: Server Actions only accept `application/x-www-form-urlencoded` or `multipart/form-data` content types from the same origin, preventing simple cross-origin POST attacks.

3. **SameSite Cookie Protection**: Session cookies are set with `SameSite=Lax` (or stricter), which prevents the browser from sending cookies with cross-site POST requests initiated by third-party sites.

### What This Means

**You do NOT need to implement custom CSRF tokens for Server Actions.** The framework handles CSRF protection automatically.

### When Custom CSRF Tokens Are Required

Custom CSRF tokens are **only** needed for:
- **Route Handlers** (`/api/*` routes) that handle state-mutating POST/PUT/PATCH/DELETE requests
- Direct form submissions that bypass Server Actions
- Any admin panel endpoints that use traditional REST API patterns

For these cases, use the utilities in `src/lib/csrf.ts`:

```typescript
import { generateCsrfToken, verifyCsrfToken } from '@/lib/csrf';

// In a Route Handler (route.ts):
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify CSRF token for non-Server Action requests
  const isValid = await verifyCsrfToken(request);
  
  if (!isValid) {
    return NextResponse.json(
      { error: 'CSRF validation failure' },
      { status: 403 }
    );
  }

  // ... handle the request
}
```

## References

- Requirements: 15.6, 15.7
- Design: Security Headers and CSRF Protection section
- Next.js Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#security
