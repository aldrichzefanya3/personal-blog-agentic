/**
 * Markdown preview API route.
 * Subtask 17.2 - Requirements 11.7
 * Updated for CSRF protection - Task 21.1, Requirements 15.6, 15.7
 *
 * POST /api/preview
 * Request: { markdown: string, csrf_token?: string }
 * Response: { html: string }
 * Auth: Requires authenticated session (401 if none)
 * CSRF: Requires valid CSRF token (403 if invalid)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { renderMarkdown } from '@/lib/content/markdown';
import { verifyCsrfToken } from '@/lib/csrf';
import { z } from 'zod';

const PreviewRequestSchema = z.object({
  markdown: z.string(),
});

export async function POST(request: NextRequest) {
  // Require authenticated session
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify CSRF token for non-Server Action POST requests (Req 15.6, 15.7)
  const isValidCsrf = await verifyCsrfToken(request);

  if (!isValidCsrf) {
    return NextResponse.json(
      { error: 'CSRF validation failure' },
      { status: 403 },
    );
  }

  try {
    // Parse request body
    const body = await request.json();
    const parseResult = PreviewRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request: markdown field required' },
        { status: 400 },
      );
    }

    const { markdown } = parseResult.data;

    // Render markdown to sanitized HTML
    const html = await renderMarkdown(markdown);

    return NextResponse.json({ html });
  } catch (error) {
    console.error('Preview API error:', error);
    return NextResponse.json(
      { error: 'Failed to render markdown' },
      { status: 500 },
    );
  }
}
