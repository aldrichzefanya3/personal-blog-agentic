import { timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import {
  answerTelegramCallback,
  removeTelegramApprovalButtons,
} from '@/lib/ai-writer/telegram';

export const runtime = 'nodejs';

interface TelegramCallbackUpdate {
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
  };
}

function hasValidWebhookSecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const actual = request.headers.get('x-telegram-bot-api-secret-token');
  if (!expected || !actual) return false;

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export async function POST(request: Request) {
  if (!hasValidWebhookSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID;
  const expectedChatId = process.env.TELEGRAM_CHAT_ID;
  if (!allowedUserId || !expectedChatId) {
    return NextResponse.json(
      { error: 'Telegram approval settings are incomplete' },
      { status: 500 },
    );
  }

  let update: TelegramCallbackUpdate;
  try {
    update = (await request.json()) as TelegramCallbackUpdate;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON update' }, { status: 400 });
  }

  const callback = update.callback_query;
  if (!callback) {
    return NextResponse.json({ ok: true });
  }

  if (
    String(callback.from.id) !== allowedUserId ||
    !callback.message ||
    String(callback.message.chat.id) !== expectedChatId
  ) {
    return NextResponse.json(
      { error: 'Telegram user or chat is not allowed' },
      { status: 403 },
    );
  }

  const match = callback.data?.match(
    /^aiw:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(publish|reject)$/,
  );
  if (!match) {
    await answerTelegramCallback(callback.id, 'This action is invalid.');
    return NextResponse.json({ ok: true });
  }

  const [, postId, action] = match;
  const result =
    action === 'publish'
      ? await sql<Array<{ id: string; title: string; slug: string }>>`
        UPDATE public.posts
        SET status = 'PUBLISHED',
            published_at = now(),
            ai_review_status = 'approved'
        WHERE id = ${postId}::uuid
          AND ai_generated = TRUE
          AND status = 'DRAFT'
          AND ai_review_status = 'pending'
        RETURNING id, title, slug
      `
      : await sql<Array<{ id: string; title: string; slug: string }>>`
        UPDATE public.posts
        SET ai_review_status = 'rejected'
        WHERE id = ${postId}::uuid
          AND ai_generated = TRUE
          AND status = 'DRAFT'
          AND ai_review_status = 'pending'
        RETURNING id, title, slug
      `;

  if (result.length === 0) {
    await answerTelegramCallback(callback.id, 'This post was already handled.');
  } else if (action === 'publish') {
    const post = result[0];
    revalidatePath('/');
    revalidatePath(`/posts/${post.slug}`);
    revalidatePath('/admin/posts');
    await answerTelegramCallback(callback.id, 'Post published.');
  } else {
    await answerTelegramCallback(callback.id, 'Post kept as a draft.');
  }

  await removeTelegramApprovalButtons(
    callback.message.chat.id,
    callback.message.message_id,
  );

  return NextResponse.json({ ok: true });
}
