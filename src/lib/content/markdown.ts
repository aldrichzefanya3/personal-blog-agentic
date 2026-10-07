/**
 * Markdown rendering pipeline.
 *
 * Pipeline: remarkParse → remarkGfm → remarkRehype → rehypeSanitize → rehypeStringify
 *
 * Dangerous HTML passthrough is disabled at the remarkRehype step.
 * All output is sanitized through the custom schema before being returned.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

import { RenderError } from '../errors';
import { sanitizeSchema } from './sanitizer';

/**
 * A pre-built, frozen processor instance shared across all calls.
 * unified processors are stateless after .freeze(), so this is safe.
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, {
    // Never pass raw HTML blocks from the Markdown source through to the HTML
    // output — they would bypass rehype-sanitize if allowed here.
    allowDangerousHtml: false,
  })
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify)
  .freeze();

/**
 * Renders a Markdown string to a sanitized HTML string.
 *
 * @param markdown - The raw Markdown input (may be untrusted user content).
 * @returns A Promise resolving to a safe HTML string.
 * @throws {RenderError} If the pipeline fails for any reason (HTTP 500 equivalent).
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  try {
    const file = await processor.process(markdown);
    return String(file);
  } catch (cause) {
    throw new RenderError(
      'Failed to render Markdown content. Please try again later.',
      cause,
    );
  }
}
