import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { notifyPendingTelegramPosts } from '@/lib/ai-writer/telegram';
import { runEnabledAiWriters } from '@/lib/ai-writer/runner';

export const runtime = 'nodejs';
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const expected = process.env.AI_WRITER_CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!expected || !authorization?.startsWith('Bearer ')) {
    return false;
  }

  const actualBuffer = Buffer.from(authorization.slice('Bearer '.length));
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await notifyPendingTelegramPosts();
    const results = await runEnabledAiWriters();
    if (results.length === 0) {
      return NextResponse.json({
        status: 'skipped',
        reason: 'No AI Writer accounts are enabled',
      });
    }
    await notifyPendingTelegramPosts();

    const failed = results.filter((result) => result.status === 'failed');
    const created = results.filter((result) => result.status === 'created');
    const skipped = results.filter((result) => result.status === 'skipped');
    const response = {
      status: failed.length > 0 ? 'partial_failure' : 'completed',
      created: created.length,
      skipped: skipped.length,
      failed: failed.length,
      results,
    };

    if (failed.length > 0) {
      return NextResponse.json(response, { status: 500 });
    }
    return NextResponse.json(response);
  } catch (error) {
    console.error('AI Writer scheduled run failed', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unknown AI Writer failure',
      },
      { status: 500 },
    );
  }
}
