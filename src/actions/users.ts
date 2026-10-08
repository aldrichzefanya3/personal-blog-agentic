'use server';

import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from '@/lib/auth/session';
import { requireRole } from '@/lib/authz/guards';
import {
  generateAnonymousDisplayName,
  getAllUsers,
  getUserById,
  setAiWriterEnabled as setAiWriterEnabledInDatabase,
  updateManagedUserRole,
  updateUserProfile,
} from '@/lib/db/queries/users';
import { AuthError } from '@/lib/errors';
import type { UserRole } from '@/types/database';

function generateRandomPassword(): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const allCharacters = `${uppercase}${lowercase}${digits}`;
  const passwordCharacters = [
    uppercase[randomInt(uppercase.length)],
    lowercase[randomInt(lowercase.length)],
    digits[randomInt(digits.length)],
  ];

  while (passwordCharacters.length < 14) {
    passwordCharacters.push(allCharacters[randomInt(allCharacters.length)]);
  }

  for (let index = passwordCharacters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [passwordCharacters[index], passwordCharacters[swapIndex]] = [
      passwordCharacters[swapIndex],
      passwordCharacters[index],
    ];
  }

  return passwordCharacters.join('');
}

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured',
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Allows any authenticated ADMIN or EDITOR user to update their display name.
 */
export async function updateMyDisplayName(displayName: string): Promise<
  | {
      success: true;
      user: { id: string; role: UserRole; display_name: string | null };
    }
  | { success: false; error: string }
> {
  try {
    const session = await getServerSession();

    if (!session) {
      return { success: false, error: 'Authentication required' };
    }

    const trimmedName = displayName.trim();

    if (!trimmedName) {
      return { success: false, error: 'Display name cannot be empty' };
    }

    if (trimmedName.length > 50) {
      return {
        success: false,
        error: 'Display name must be 50 characters or fewer',
      };
    }

    const updatedUser = await updateUserProfile(session.id, {
      display_name: trimmedName,
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        role: updatedUser.role,
        display_name: updatedUser.display_name,
      },
    };
  } catch (error) {
    console.error('Error updating display name:', error);
    return { success: false, error: 'Failed to update display name' };
  }
}

/**
 * Creates a new user account for an admin-managed invite.
 */
export async function createManagedUser(
  email: string,
  role: 'EDITOR' | 'AI_WRITER' = 'EDITOR',
): Promise<
  | {
      success: true;
      user: {
        id: string;
        email: string;
        role: UserRole;
        display_name: string | null;
      };
      temporaryPassword: string | null;
    }
  | { success: false; error: string }
> {
  try {
    await requireRole('user:manage');
    const cleanEmail = email.trim().toLowerCase();

    if (role !== 'EDITOR' && role !== 'AI_WRITER') {
      return { success: false, error: 'Please choose a valid account role' };
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Please provide a valid email address' };
    }

    const adminClient = getSupabaseAdminClient();
    const temporaryPassword = generateRandomPassword();
    const generatedName = generateAnonymousDisplayName();

    const { data: createdUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: temporaryPassword,
        email_confirm: true,
        app_metadata: { managed_role: role },
        user_metadata: {
          display_name: generatedName,
        },
      });

    if (createError) {
      console.error('Error creating managed user:', {
        message: createError.message,
        status: createError.status,
      });
      return {
        success: false,
        error: `Failed to create user account: ${createError.message}`,
      };
    }
    if (!createdUser?.user) {
      console.error('Supabase returned no user after account creation');
      return {
        success: false,
        error: 'Failed to create user account: Supabase returned no user',
      };
    }

    return {
      success: true,
      user: {
        id: createdUser.user.id,
        email: cleanEmail,
        role,
        display_name: generatedName,
      },
      temporaryPassword: role === 'EDITOR' ? temporaryPassword : null,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.statusCode === 401) {
        return { success: false, error: 'Authentication required' };
      }
      if (error.statusCode === 403) {
        return { success: false, error: 'Insufficient permissions' };
      }
    }

    console.error('Error creating managed user:', error);
    return { success: false, error: 'Failed to create user account' };
  }
}

export async function changeManagedUserRole(
  userId: string,
  role: 'EDITOR' | 'AI_WRITER',
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireRole('user:manage');
    if (role !== 'EDITOR' && role !== 'AI_WRITER') {
      return { success: false, error: 'Please choose a valid account role' };
    }
    const user = await updateManagedUserRole(userId, role);
    if (!user) {
      return {
        success: false,
        error: 'User not found or its role cannot be changed',
      };
    }
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.statusCode === 401) {
        return { success: false, error: 'Authentication required' };
      }
      if (error.statusCode === 403) {
        return { success: false, error: 'Insufficient permissions' };
      }
    }
    console.error('Error changing managed user role:', error);
    return { success: false, error: 'Failed to change user role' };
  }
}

export async function setManagedAiWriterEnabled(
  userId: string,
  enabled: boolean,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireRole('user:manage');
    if (typeof enabled !== 'boolean') {
      return { success: false, error: 'Run daily must be enabled or disabled' };
    }
    const user = await setAiWriterEnabledInDatabase(userId, enabled);
    if (!user) {
      return { success: false, error: 'AI Writer account not found' };
    }
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.statusCode === 401) {
        return { success: false, error: 'Authentication required' };
      }
      if (error.statusCode === 403) {
        return { success: false, error: 'Insufficient permissions' };
      }
    }
    console.error('Error changing AI Writer run setting:', error);
    return { success: false, error: 'Failed to change AI Writer run setting' };
  }
}

/**
 * Deletes a user account. Admins can remove any other user.
 */
export async function deleteUserAccount(
  userId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requireRole('user:manage');

    if (session.id === userId) {
      return { success: false, error: 'You cannot remove your own account' };
    }

    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return { success: false, error: 'User not found' };
    }

    if (targetUser.role === 'ADMIN') {
      const allUsers = await getAllUsers();
      const adminCount = allUsers.filter(
        (user) => user.role === 'ADMIN',
      ).length;

      if (adminCount <= 1) {
        return { success: false, error: 'At least one admin must remain' };
      }
    }

    const adminClient = getSupabaseAdminClient();

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      console.error('Error deleting auth user:', error);
      return { success: false, error: 'Failed to delete user account' };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.statusCode === 401) {
        return { success: false, error: 'Authentication required' };
      }
      if (error.statusCode === 403) {
        return { success: false, error: 'Insufficient permissions' };
      }
    }

    console.error('Error deleting user account:', error);
    return { success: false, error: 'Failed to delete user account' };
  }
}
