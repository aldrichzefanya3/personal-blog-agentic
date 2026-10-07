// src/test/unit/markdown.test.ts
// Unit tests for renderMarkdown() — sanitization of XSS payloads
// Requirements: 18.1

import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '@/lib/content/markdown';

describe('renderMarkdown() — XSS sanitization (Req 18.1)', () => {
  describe('<script> injection', () => {
    it('strips inline <script> tag injected inside markdown', async () => {
      const html = await renderMarkdown('<script>alert(1)</script>');
      expect(html).not.toContain('<script');
      expect(html).not.toContain('alert(1)');
    });

    it('strips <script> tag embedded in paragraph text', async () => {
      // allowDangerousHtml: false means raw HTML is not parsed — the source is
      // treated as literal text. The pipeline must not emit a <script> element.
      const html = await renderMarkdown(
        'Hello <script>alert(1)</script> world',
      );
      expect(html).not.toContain('<script');
      expect(html).not.toContain('</script>');
    });
  });

  describe('<img> with event-handler attributes', () => {
    it('strips onerror attribute from <img> tag', async () => {
      const html = await renderMarkdown('<img src="x" onerror="alert(1)">');
      expect(html).not.toContain('onerror');
    });

    it('strips onload attribute from any tag', async () => {
      const html = await renderMarkdown(
        '<img src="valid.png" onload="stealCookies()">',
      );
      expect(html).not.toContain('onload');
    });

    it('strips all on* event handlers from rendered output', async () => {
      const html = await renderMarkdown(
        '<div onclick="x()" onmouseover="y()">text</div>',
      );
      expect(html).not.toMatch(/\bon\w+\s*=/i);
    });
  });

  describe('<a href="javascript:..."> injection', () => {
    it('strips javascript: protocol from anchor href', async () => {
      const html = await renderMarkdown('[click me](javascript:alert(1))');
      expect(html).not.toContain('javascript:');
    });

    it('strips javascript: href injected as raw HTML', async () => {
      const html = await renderMarkdown(
        '<a href="javascript:alert(1)">click</a>',
      );
      expect(html).not.toContain('javascript:');
    });
  });

  describe('data: URI injection', () => {
    it('strips data:text/html URI from anchor href', async () => {
      const html = await renderMarkdown(
        '<a href="data:text/html,<script>alert(1)</script>">click</a>',
      );
      expect(html).not.toContain('data:text/html');
    });

    it('strips data: URI from img src', async () => {
      const html = await renderMarkdown(
        '<img src="data:text/html,<h1>hi</h1>">',
      );
      expect(html).not.toContain('data:');
    });
  });

  describe('safe markdown renders correctly', () => {
    it('renders plain text without modification', async () => {
      const html = await renderMarkdown('Hello, world!');
      expect(html).toContain('Hello, world!');
    });

    it('renders a safe link with http:// href', async () => {
      const html = await renderMarkdown('[Blog](https://example.com)');
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('Blog');
    });

    it('renders a safe image with https:// src', async () => {
      const html = await renderMarkdown(
        '![alt text](https://example.com/image.png)',
      );
      expect(html).toContain('src="https://example.com/image.png"');
      expect(html).toContain('alt="alt text"');
    });

    it('renders bold and italic text', async () => {
      const html = await renderMarkdown('**bold** and _italic_');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
    });
  });
});
