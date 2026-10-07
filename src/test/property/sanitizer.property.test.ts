/**
 * Property-based test CP-3: Markdown Sanitization — XSS Safety Invariant
 *
 * For any arbitrary string input, the rendered output of renderMarkdown()
 * SHALL NOT contain:
 *  - Any <script element
 *  - Any attribute whose name matches on[a-z]+=
 *  - Any javascript: protocol reference
 *  - Any data:text/html URI
 *
 * **Validates: Requirements 1.7, 14.5**
 * Requirements: 18.6
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { renderMarkdown } from '@/lib/content/markdown';

describe('CP-3: Markdown Sanitization — XSS Safety Invariant', () => {
  /**
   * **Validates: Requirements 1.7, 14.5**
   *
   * Property 3: For any arbitrary string input, the rendered HTML output must
   * not contain <script elements, inline on[word]= event handlers,
   * javascript: URIs, or data:text/html URIs.
   */
  it('Property 3: no XSS vectors survive sanitization for any arbitrary input', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (input) => {
        const html = await renderMarkdown(input);
        const noScript = !/<script/i.test(html);
        const noEventHandlers = !/\son\w+=/i.test(html);
        const noJavascriptUri = !/javascript:/i.test(html);
        const noDataTextHtml = !/data:text\/html/i.test(html);
        return noScript && noEventHandlers && noJavascriptUri && noDataTextHtml;
      }),
      { numRuns: 100 },
    );
  });
});
