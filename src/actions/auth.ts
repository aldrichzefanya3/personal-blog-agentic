'use server';

/**
 * Authentication Server Actions
 *
 * Requirements: 8.1, 8.4, 8.5, 8.7, 8.10, 8.11, 9.1, 9.2, 9.4, 9.9, 15.6, 17.1, 17.3
 *
 * Req 8.1  — Sessions stored in HTTP-only, Secure, SameSite=Lax cookies
 * Req 8.4  — Password reset sends link, invalidates prior tokens, expires in 60 min
 * Req 8.5  — Reset link updates credential, invalidates token, redirects to sign-in
 * Req 8.7  — Logout invalidates session and clears cookie
 * Req 8.10 — Password policy: 8-128 chars, uppercase, lowercase, digit
 * Req 8.11 — Failed auth uses generic message, locks after 5 failures in 10 min
 * Req 9.1  — One-time admin signup flow with secret token
 * Req 9.2  — Role-based login with server-side verification
 * Req 9.4  — RBAC enforcement (only ADMIN and EDITOR accounts may log in)
 * Req 9.9  — Role always comes from public.users.role (database source of truth)
 * Req 15.6 — Clear CSRF token on logout
 * Req 17.1 — Environment validation for ADMIN_SIGNUP_SECRET
 * Req 17.3 — Validate required environment variables
 */

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { clearCsrfToken } from '@/lib/csrf';
import { hasAdminUser } from '@/lib/auth/admin-check';
import { createClient } from '@supabase/supabase-js';
import { generateAnonymousDisplayName, getUserById } from '@/lib/db/queries/users';
import { getServerSession } from '@/lib/auth/session';
import type { UserRole } from '@/types/database';

/**
 * Password validation regex
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - Maximum 128 characters (checked separately)
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Validates password against policy requirements (Req 8.10)
 */
function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: 'Password must not exceed 128 characters',
    };
  }

  if (!PASSWORD_REGEX.test(password)) {
    return {
      valid: false,
      error:
        'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
    };
  }

  return { valid: true };
}

/**
 * Login action with role-based authentication (Req 8.11, 9.1, 9.2, 9.4, 9.9)
 *
 * Authenticates a user with email, password, and selected role.
 * Uses generic error messages that do not distinguish between unknown username
 * and incorrect password.
 *
 * SERVER-SIDE ROLE VERIFICATION SEQUENCE:
 * 1. Authenticate with Supabase
 * 2. Fetch user's actual role from public.users table
 * 3. Verify selected role matches database role
 * 4. Only proceed if verification passes
 *
 * SECURITY NOTES:
 * - The role selected in the UI is a FILTER, not a permission grant
 * - The authoritative role always comes from public.users.role (database)
 * - This server-side check prevents client-side role manipulation
 * - This check is SEPARATE from and happens BEFORE existing RBAC guards
 * - Only ADMIN and EDITOR roles are accepted by the login flow
 *
 * @param formData - Form data containing email, password, role, and optional redirectTo
 * @returns Error object if authentication fails, otherwise redirects
 */
export async function loginAction(formData: FormData) {
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const selectedRole = formData.get('role')?.toString() as UserRole | undefined;
  const redirectTo = formData.get('redirectTo')?.toString() || '/admin';

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  if (!selectedRole || !['ADMIN', 'EDITOR'].includes(selectedRole)) {
    return { error: 'Please select a valid role' };
  }

  const supabase = await createSupabaseServerClient();

  // STEP 1: Authenticate with Supabase (Req 8.11)
  // Use generic error message that doesn't distinguish between
  // unknown username and incorrect password
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    // Note: Supabase handles rate limiting server-side. The requirement
    // for 5 consecutive failures within 10 minutes leading to a 15-minute
    // block is expected to be configured in Supabase Auth settings.
    return {
      error: 'Invalid credentials. Please check your email and password.',
    };
  }

  // STEP 2: Fetch user's actual role from public.users table (Req 9.9)
  // The role must come from the database, never from JWT claims or client-supplied values
  const user = await getUserById(authData.user.id);

  if (!user) {
    // Edge case: user authenticated but no public.users row exists
    // This should not happen if auth trigger is working correctly
    await supabase.auth.signOut();
    return {
      error: 'Account setup incomplete. Please contact the administrator.',
    };
  }

  // STEP 3: Verify selected role matches database role (Req 9.2, 9.4)
  // Defense-in-depth: multiple layers ensure proper access control
  if (selectedRole === 'ADMIN' && user.role !== 'ADMIN') {
    // User selected Admin but database role is not ADMIN
    await supabase.auth.signOut();
    return {
      error: 'Invalid role selection for this account',
    };
  }

  if (selectedRole === 'EDITOR' && user.role !== 'EDITOR') {
    // User selected Editor but database role is not EDITOR
    await supabase.auth.signOut();
    return {
      error: 'Invalid role selection for this account',
    };
  }

  // STEP 4: Role verification passed — session is valid and authorized
  // Req 8.1: Session is automatically stored in HTTP-only, Secure,
  // SameSite=Lax cookie by the Supabase server client
  redirect(redirectTo);
}

/**
 * Logout action (Req 8.7, 15.6)
 *
 * Invalidates the server-side session and clears the session cookie.
 * Also clears the CSRF token cookie.
 */
export async function logoutAction() {
  const supabase = await createSupabaseServerClient();

  // Req 8.7: Invalidate server-side session and clear cookie
  await supabase.auth.signOut();

  // Req 15.6: Clear CSRF token cookie
  await clearCsrfToken();

  // Redirect to login page
  redirect('/auth/login');
}

/**
 * Request password reset action (Req 8.4)
 *
 * Sends a password reset link to the user's registered email address.
 * Supabase automatically:
 * - Invalidates any prior unused reset tokens for that account
 * - Expires the new reset link after the configured time (60 minutes)
 *
 * @param formData - Form data containing email
 * @returns Success/error state
 */
export async function requestPasswordResetAction(formData: FormData) {
  const email = formData.get('email')?.toString();

  if (!email) {
    return { error: 'Email is required' };
  }

  const supabase = await createSupabaseServerClient();

  // Req 8.4: Send reset link, invalidate prior tokens, expire after 60 min
  // The redirect URL should point to the password reset form page
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });

  if (error) {
    return { error: 'Failed to send password reset email. Please try again.' };
  }

  return {
    success:
      'If an account exists with that email, a password reset link has been sent.',
  };
}

/**
 * Update password action (Req 8.5, 8.10)
 *
 * Updates the user's password after following a valid password reset link.
 * The reset token is verified by Supabase and the user must be authenticated
 * with the reset token to call this action.
 *
 * @param formData - Form data containing the new password
 * @returns Error object if update fails, otherwise redirects to sign-in
 */
export async function updatePasswordAction(formData: FormData) {
  const password = formData.get('password')?.toString();

  if (!password) {
    return { error: 'Password is required' };
  }

  // Req 8.10: Validate password against policy
  const validation = validatePassword(password);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const supabase = await createSupabaseServerClient();

  // Req 8.5: Update credential and invalidate consumed reset token
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    // Req 8.6: Handle expired or invalid reset tokens
    if (
      error.message.includes('expired') ||
      error.message.includes('invalid')
    ) {
      return {
        error:
          'Password reset link is invalid or expired. Please request a new one.',
      };
    }
    return { error: 'Failed to update password. Please try again.' };
  }

  // Req 8.5: Redirect to sign-in page after successful password update
  redirect(
    '/auth/login?message=Password updated successfully. Please sign in.',
  );
}

/** Allows an authenticated account to choose a new password from its profile. */
export async function changeMyPassword(password: string) {
  const session = await getServerSession();

  if (!session) {
    return { error: 'Authentication required' };
  }

  const validation = validatePassword(password);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: 'Failed to update password. Please try again.' };
  }

  return { success: 'Password updated successfully.' };
}

/**
 * One-time admin signup action (Req 8.1, 8.10, 9.1, 17.1, 17.3)
 *
 * Creates the first admin user account using a secret token for authorization.
 * This action is only accessible before any admin user exists in the system.
 * After the first admin is created, the setup route self-destructs (returns 404).
 *
 * Security model:
 * - Requires `ADMIN_SIGNUP_SECRET` environment variable (validated at startup)
 * - Secret must be communicated out-of-band to the blog owner
 * - Route returns 404 after first admin exists (defense-in-depth)
 * - Uses service-role client to create user with email_confirm: true
 * - Sets trusted app metadata so the database trigger creates the ADMIN profile
 *
 * @param formData - Form data containing email, password, and secret
 * @returns Success message or error object
 */
export async function adminSignupAction(formData: FormData) {
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const secret = formData.get('secret')?.toString();

  // Validate required fields
  if (!email || !password || !secret) {
    return {
      error: 'Email, password, and secret token are required',
    };
  }

  // Verify secret matches ADMIN_SIGNUP_SECRET environment variable (Req 17.1)
  if (secret !== process.env.ADMIN_SIGNUP_SECRET) {
    return {
      error: 'Invalid signup secret',
    };
  }

  // Check if an admin user already exists (Req 9.1 — one-time only)
  const adminExists = await hasAdminUser();
  if (adminExists) {
    return {
      error: 'Admin signup is disabled',
    };
  }

  // Validate password against policy (Req 8.10)
  const validation = validatePassword(password);
  if (!validation.valid) {
    return { error: validation.error };
  }

  // Create Supabase admin client using service-role key
  // This bypasses RLS and allows setting email_confirm: true
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      error:
        'Server configuration error: missing Supabase credentials',
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Create the user account with email confirmation pre-verified
  const { data: userData, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { managed_role: 'ADMIN' },
      user_metadata: { display_name: generateAnonymousDisplayName() },
    });

  if (createError || !userData.user) {
    return {
      error: `Failed to create admin account: ${createError?.message ?? 'Unknown error'}`,
    };
  }

  // Success — return message instructing user to sign in
  return {
    success:
      'Admin account created successfully. Please sign in at /auth/login',
  };
}
