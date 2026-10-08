import 'server-only';

import { sql } from '@/lib/db/client';
import { generateArticle } from '@/lib/ai-writer/gemini';
import { generateSlug } from '@/lib/slug';

interface ClaimedTopic {
  id: string;
  topic: string;
  category_id: string;
  category_name: string;
  auto_publish: boolean;
}

interface AiWriterAccount {
  id: string;
  display_name: string | null;
}

export type AiWriterRunResult =
  | {
      writerId: string;
      status: 'created';
      post: { id: string; title: string; slug: string; status: string };
    }
  | { writerId: string; status: 'skipped' }
  | { writerId: string; status: 'failed'; error: string };

async function claimNextTopic(): Promise<ClaimedTopic | null> {
  const claimed = await sql.begin(async (transaction) => {
    const rows = await transaction<ClaimedTopic[]>`
      WITH next_topic AS (
        SELECT id
        FROM public.ai_writer_topics
        WHERE enabled
          AND (
            state = 'pending'
            OR (state = 'generating' AND claimed_at < now() - interval '30 minutes')
          )
        ORDER BY sort_order, id
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE public.ai_writer_topics AS topic
      SET state = 'generating',
          claimed_at = now(),
          last_error = NULL
      FROM next_topic, public.categories AS category
      WHERE topic.id = next_topic.id
        AND category.id = topic.category_id
      RETURNING topic.id::text AS id, topic.topic, topic.category_id,
        category.name AS category_name, category.auto_publish
    `;
    return rows[0] ?? null;
  });
  return claimed;
}

async function createGeneratedPost(
  topic: ClaimedTopic,
  writerId: string,
  forceDraft: boolean,
): Promise<{ id: string; title: string; slug: string; status: string }> {
  const existingTitles = await sql<Array<{ title: string }>>`
    SELECT title FROM public.posts ORDER BY created_at DESC
  `;
  const article = await generateArticle({
    topic: topic.topic,
    category: topic.category_name,
    existingTitles: existingTitles.map(({ title }) => title),
  });

  if (
    article.category.toLocaleLowerCase() !==
    topic.category_name.toLocaleLowerCase()
  ) {
    throw new Error(
      `Generated category "${article.category}" does not match assigned category "${topic.category_name}"`,
    );
  }

  const autoPublish = topic.auto_publish && !forceDraft;
  const slugBase = generateSlug(article.slug || article.title).slice(0, 220);
  const uniqueSlug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
  const status = autoPublish ? 'PUBLISHED' : 'DRAFT';
  const reviewStatus = autoPublish ? 'approved' : 'pending';

  return sql.begin(async (transaction) => {
    await transaction`
      SELECT pg_advisory_xact_lock(
        hashtextextended(lower(trim(${article.title})), 0)
      )
    `;

    const duplicate = await transaction<Array<{ id: string }>>`
      SELECT id
      FROM public.posts
      WHERE lower(trim(title)) = lower(trim(${article.title}))
      LIMIT 1
    `;
    if (duplicate.length > 0) {
      throw new Error(
        `Generated title duplicates an existing post: "${article.title}"`,
      );
    }

    const [post] = await transaction<
      Array<{ id: string; title: string; slug: string; status: string }>
    >`
      INSERT INTO public.posts (
        title, slug, excerpt, content, author_id, status, published_at,
        ai_generated, ai_review_status, ai_meta_description, ai_image_prompt
      )
      VALUES (
        ${article.title},
        ${uniqueSlug},
        ${article.excerpt},
        ${article.content_markdown},
        ${writerId},
        ${status},
        ${autoPublish ? new Date() : null},
        TRUE,
        ${reviewStatus},
        ${article.meta_description},
        ${article.image_prompt}
      )
      RETURNING id, title, slug, status
    `;

    await transaction`
      INSERT INTO public.post_categories (post_id, category_id)
      VALUES (${post.id}, ${topic.category_id})
    `;

    for (const tagName of [...new Set(article.tags)]) {
      const tagSlugBase = generateSlug(tagName).slice(0, 85);
      if (!tagSlugBase) {
        throw new Error(
          `Generated tag cannot be converted to a URL slug: "${tagName}"`,
        );
      }
      const tagSlug = `${tagSlugBase}-${crypto.randomUUID().slice(0, 8)}`;
      const [tag] = await transaction<Array<{ id: string }>>`
        INSERT INTO public.tags (name, slug)
        VALUES (${tagName}, ${tagSlug})
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;
      await transaction`
        INSERT INTO public.post_tags (post_id, tag_id)
        VALUES (${post.id}, ${tag.id})
        ON CONFLICT DO NOTHING
      `;
    }

    await transaction`
      UPDATE public.ai_writer_topics
      SET state = 'completed',
          claimed_at = NULL,
          completed_at = now(),
          post_id = ${post.id},
          last_error = NULL
      WHERE id = ${topic.id}
    `;

    return post;
  });
}

async function releaseTopic(topicId: string, error: unknown): Promise<void> {
  const message =
    error instanceof Error ? error.message : 'Unknown AI Writer failure';
  await sql`
    UPDATE public.ai_writer_topics
    SET state = 'pending',
        claimed_at = NULL,
        last_error = ${message.slice(0, 1000)}
    WHERE id = ${topicId}
      AND state = 'generating'
  `;
}

async function runWriter(
  writer: AiWriterAccount,
  forceDraft = false,
): Promise<AiWriterRunResult> {
  let topic: ClaimedTopic | null = null;
  try {
    topic = await claimNextTopic();
    if (!topic) {
      return { writerId: writer.id, status: 'skipped' };
    }

    const post = await createGeneratedPost(topic, writer.id, forceDraft);
    console.info('AI Writer created a post', {
      writerId: writer.id,
      postId: post.id,
      slug: post.slug,
      status: post.status,
      topicId: topic.id,
    });
    return { writerId: writer.id, status: 'created', post };
  } catch (error) {
    if (topic) {
      await releaseTopic(topic.id, error);
    }
    console.error('AI Writer account run failed', {
      writerId: writer.id,
      error,
    });
    return {
      writerId: writer.id,
      status: 'failed',
      error:
        error instanceof Error ? error.message : 'Unknown generation failure',
    };
  }
}

export async function runEnabledAiWriters(): Promise<AiWriterRunResult[]> {
  const writers = await sql<AiWriterAccount[]>`
    SELECT id, display_name
    FROM public.users
    WHERE role = 'AI_WRITER'
      AND ai_writer_enabled = TRUE
    ORDER BY created_at, id
  `;
  return Promise.all(writers.map((writer) => runWriter(writer)));
}

export async function runAiWriterTestDraft(
  writerId: string,
): Promise<AiWriterRunResult> {
  const [writer] = await sql<AiWriterAccount[]>`
    SELECT id, display_name
    FROM public.users
    WHERE id = ${writerId}::uuid
      AND role = 'AI_WRITER'
  `;
  if (!writer) {
    throw new Error('AI Writer account not found');
  }
  return runWriter(writer, true);
}
