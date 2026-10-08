/**
 * Environment variable validation.
 *
 * Call validateEnv() once at application startup (e.g. in next.config.ts or a
 * top-level server module) to fail fast if required variables are missing.
 * This prevents obscure runtime errors caused by undefined env vars deep inside
 * request handlers.
 *
 * Requirement 17.3 — The system SHALL validate all required environment
 * variables at startup and exit with a descriptive error if any are absent.
 */

/**
 * The complete list of environment variables that must be present for the
 * application to function correctly.  Add new variables here as they are
 * introduced so the check stays in sync with .env.example.
 */
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'NEXT_PUBLIC_SITE_URL',
  'ADMIN_SIGNUP_SECRET',
] as const;

/**
 * Validates that every variable listed in REQUIRED_ENV_VARS is present in
 * `process.env`. If one or more are missing, it throws a descriptive error so
 * the app fails fast without relying on Node-only APIs such as `process.exit`.
 *
 * This function is intentionally synchronous and side-effectful — it is meant
 * to be called at module load time before any request handling begins.
 */
export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length === 0) {
    return;
  }

  const message = [
    '',
    '========================================================',
    '  Missing required environment variables',
    '========================================================',
    '',
    '  The following variables are not set:',
    ...missing.map((key) => `    - ${key}`),
    '',
    '  Copy .env.example to .env.local and fill in real values.',
    '  See .env.example for documentation on each variable.',
    '',
    '========================================================',
    '',
  ].join('\n');

  throw new Error(message);
}
