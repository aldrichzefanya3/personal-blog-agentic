'use client';

/**
 * CSRF Token Initializer Component
 *
 * This client component initializes the CSRF token on mount by calling
 * a Server Action. This ensures the token is available for client-side
 * API calls that require CSRF protection.
 *
 * Requirements 15.6: Generate per-session CSRF token
 */

import { useEffect, useState } from 'react';
import { initializeCsrfTokenAction } from '@/actions/csrf';

/**
 * Initializes CSRF token on component mount.
 * This component should be included in the admin layout.
 */
export function CsrfTokenInitializer() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only initialize once
    if (initialized) return;

    // Call Server Action to generate CSRF token
    initializeCsrfTokenAction()
      .then(() => {
        setInitialized(true);
      })
      .catch((error) => {
        console.error('Failed to initialize CSRF token:', error);
      });
  }, [initialized]);

  // This component renders nothing - it only handles the token initialization
  return null;
}
