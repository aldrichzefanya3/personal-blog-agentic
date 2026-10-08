'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/authz/guards';
import { runAiWriterTestDraft } from '@/lib/ai-writer/runner';
import { notifyPendingTelegramPosts } from '@/lib/ai-writer/telegram';
import { AuthError } from '@/lib/errors';

export async function runAiWriterTest(writerId: string): Promise<
  | {
      success: true;
      title: string;
      status: string;
      notificationWarning: string | null;
    }
  | { success: false; error: string }
> {
  try {
    await requireRole('user:manage');
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        writerId,
      )
    ) {
      return { success: false, error: 'Invalid AI Writer account ID' };
    }

    const result = await runAiWriterTestDraft(writerId);
    if (result.status === 'skipped') {
      return {
        success: false,
        error: 'No enabled topics are available for the AI Writer',
      };
    }
    if (result.status === 'failed') {
      return { success: false, error: result.error };
    }

    let notificationWarning: string | null = null;
    try {
      await notifyPendingTelegramPosts();
    } catch (error) {
      console.error('AI Writer test draft notification failed', error);
      notificationWarning =
        'The draft was created, but its Telegram notification failed.';
    }

    revalidatePath('/admin/posts');
    revalidatePath('/admin/settings');
    return {
      success: true,
      title: result.post.title,
      status: result.post.status,
      notificationWarning,
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
    console.error('AI Writer manual test run failed', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'AI Writer manual test run failed',
    };
  }
}
