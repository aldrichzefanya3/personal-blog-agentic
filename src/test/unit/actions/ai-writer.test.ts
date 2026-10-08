import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/authz/guards', () => ({
  requireRole: vi.fn(),
}));

vi.mock('@/lib/ai-writer/runner', () => ({
  runAiWriterTestDraft: vi.fn(),
}));

vi.mock('@/lib/ai-writer/telegram', () => ({
  notifyPendingTelegramPosts: vi.fn(),
}));

vi.mock('@/lib/errors', () => ({
  AuthError: class AuthError extends Error {
    constructor(
      public code: string,
      public statusCode: number,
    ) {
      super(code);
      this.name = 'AuthError';
    }
  },
}));

import { runAiWriterTest } from '@/actions/ai-writer';
import { requireRole } from '@/lib/authz/guards';
import { runAiWriterTestDraft } from '@/lib/ai-writer/runner';
import { notifyPendingTelegramPosts } from '@/lib/ai-writer/telegram';
import { AuthError } from '@/lib/errors';

const writerId = 'b9b8ce65-0295-4b7f-8af7-c5c85715d5ae';

describe('runAiWriterTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRole).mockResolvedValue({
      id: 'admin-123',
      role: 'ADMIN',
    } as never);
    vi.mocked(runAiWriterTestDraft).mockResolvedValue({
      writerId,
      status: 'created',
      post: {
        id: 'post-123',
        title: 'A safe test draft',
        slug: 'a-safe-test-draft',
        status: 'DRAFT',
      },
    });
    vi.mocked(notifyPendingTelegramPosts).mockResolvedValue(1);
  });

  it('requires admin permissions before running a test draft', async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError('FORBIDDEN', 403));

    const result = await runAiWriterTest(writerId);

    expect(result).toEqual({
      success: false,
      error: 'Insufficient permissions',
    });
    expect(runAiWriterTestDraft).not.toHaveBeenCalled();
  });

  it('creates a manual test draft and notifies Telegram', async () => {
    const result = await runAiWriterTest(writerId);

    expect(runAiWriterTestDraft).toHaveBeenCalledWith(writerId);
    expect(notifyPendingTelegramPosts).toHaveBeenCalledOnce();
    expect(result).toEqual({
      success: true,
      title: 'A safe test draft',
      status: 'DRAFT',
      notificationWarning: null,
    });
  });

  it('reports a Telegram notification failure without hiding the created draft', async () => {
    vi.mocked(notifyPendingTelegramPosts).mockRejectedValue(
      new Error('Telegram unavailable'),
    );

    const result = await runAiWriterTest(writerId);

    expect(result).toEqual({
      success: true,
      title: 'A safe test draft',
      status: 'DRAFT',
      notificationWarning:
        'The draft was created, but its Telegram notification failed.',
    });
  });

  it('rejects invalid account IDs before running the generator', async () => {
    const result = await runAiWriterTest('not-a-uuid');

    expect(result).toEqual({
      success: false,
      error: 'Invalid AI Writer account ID',
    });
    expect(runAiWriterTestDraft).not.toHaveBeenCalled();
  });
});
