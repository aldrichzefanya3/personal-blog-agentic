/**
 * Login Page (Req 8.11)
 *
 * Sign-in form that calls loginAction Server Action.
 * Displays generic error messages that do not distinguish between
 * unknown username and incorrect password.
 */

import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold">Sign in</h1>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter your credentials to access the admin panel
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
