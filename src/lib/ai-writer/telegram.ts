import { sql } from '@/lib/db/client';

interface TelegramApiResponse {
  ok: boolean;
  description?: string;
}

async function telegramRequest(
  method: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const result = (await response.json()) as TelegramApiResponse;
  if (!response.ok || !result.ok) {
    throw new Error(
      `Telegram ${method} failed: ${result.description ?? response.statusText}`,
    );
  }
}

export async function notifyPendingTelegramPosts(): Promise<number> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!chatId || !siteUrl) {
    throw new Error('TELEGRAM_CHAT_ID and NEXT_PUBLIC_SITE_URL are required');
  }

  const posts = await sql<
    Array<{
      id: string;
      title: string;
      status: string;
      ai_review_status: string;
    }>
  >`
    SELECT id, title, status, ai_review_status
    FROM public.posts
    WHERE ai_generated = TRUE
      AND telegram_notified_at IS NULL
    ORDER BY created_at ASC
    LIMIT 20
  `;

  for (const post of posts) {
    const needsApproval =
      post.status === 'DRAFT' && post.ai_review_status === 'pending';
    const message = [
      needsApproval ? 'New AI-written draft is ready for review:' : 'AI-written post created:',
      '',
      post.title,
      `${siteUrl.replace(/\/$/, '')}/admin/posts/${post.id}`,
    ].join('\n');
    const replyMarkup = needsApproval
      ? {
          inline_keyboard: [
            [
              {
                text: 'Approve & publish',
                callback_data: `aiw:${post.id}:publish`,
              },
              { text: 'Keep as draft', callback_data: `aiw:${post.id}:reject` },
            ],
          ],
        }
      : undefined;

    await telegramRequest('sendMessage', {
      chat_id: chatId,
      text: message,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });

    await sql`
      UPDATE public.posts
      SET telegram_notified_at = now()
      WHERE id = ${post.id}
        AND telegram_notified_at IS NULL
    `;
  }

  return posts.length;
}

export async function answerTelegramCallback(
  callbackQueryId: string,
  text: string,
): Promise<void> {
  await telegramRequest('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function removeTelegramApprovalButtons(
  chatId: string | number,
  messageId: number,
): Promise<void> {
  await telegramRequest('editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });
}
