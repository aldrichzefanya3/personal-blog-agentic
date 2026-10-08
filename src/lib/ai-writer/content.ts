import { z } from 'zod';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkStringify from 'remark-stringify';

export const AiArticleSchema = z.object({
  title: z.string().trim().min(10).max(255),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().trim().min(1).max(160),
  content_html: z.string().min(1),
  tags: z.array(z.string().trim().min(1).max(100)).min(1).max(8),
  category: z.string().trim().min(1).max(100),
  meta_description: z.string().trim().min(1).max(155),
  image_prompt: z.string().trim().min(1).max(500),
});

export type AiArticle = z.infer<typeof AiArticleSchema>;
export type GeneratedAiArticle = AiArticle & { content_markdown: string };

export async function parseAndValidateArticle(
  raw: string,
): Promise<GeneratedAiArticle> {
  const article = AiArticleSchema.parse(JSON.parse(raw));
  const wordCount = article.content_html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  if (wordCount < 800 || wordCount > 1200) {
    throw new Error(`Article body must be 800-1,200 words; received ${wordCount}`);
  }

  const sanitized = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(article.content_html);

  const contentHtml = String(sanitized);
  const markdown = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize)
    .use(rehypeRemark)
    .use(remarkStringify)
    .process(contentHtml);

  return {
    ...article,
    content_html: contentHtml,
    content_markdown: String(markdown),
  };
}

export function buildWriterPrompt(
  topic: string,
  category: string,
  existingTitles: string[],
): string {
  return [
    'You are "AI Writer", a blog author for Personal Blog, an educational blog for a general audience.',
    '',
    'AUDIENCE',
    'Readers of all ages and backgrounds who want accessible educational explanations.',
    '',
    'TONE AND STYLE',
    '- Friendly, clear, and educational.',
    '- Write in English.',
    '- Use short paragraphs, clear headings, and simple words.',
    '- Avoid filler introductions such as "In today’s fast-paced world".',
    '',
    'YOUR TASK',
    'Write one complete educational blog post about the exact topic provided below.',
    'Write 800-1,200 words in the article body, with an engaging title, a short introduction, 3-6 h2 sections, and a brief conclusion with a takeaway.',
    'Only state facts you are confident about. Do not invent quotes, sources, statistics, or numbers.',
    'Do not mention that you are an AI in the article body.',
    '',
    'OUTPUT FORMAT',
    'Return only valid JSON with exactly these fields: title, slug, excerpt, content_html, tags, category, meta_description, image_prompt.',
    'content_html must contain only article body markup using h2, p, ul, and li elements.',
    'excerpt must be at most 160 characters. meta_description must be at most 155 characters.',
    'tags must be an array of 1-8 short tag names.',
    `The category must be exactly "${category}".`,
    '',
    'RULES',
    'Never write about sexism, pornography, or violence.',
    'Do not repeat or closely rephrase any existing post title.',
    '',
    `TOPIC: ${topic}`,
    '',
    'EXISTING POST TITLES (avoid all of them):',
    JSON.stringify(existingTitles),
  ].join('\n');
}
