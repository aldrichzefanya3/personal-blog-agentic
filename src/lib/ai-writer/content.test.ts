import { describe, expect, it } from 'vitest';
import { parseAndValidateArticle } from './content';

function validArticle(contentHtml = `<h2>Learning</h2><p>${'knowledge '.repeat(850)}</p>`) {
  return JSON.stringify({
    title: 'A useful educational title',
    slug: 'a-useful-educational-title',
    excerpt: 'A short summary.',
    content_html: contentHtml,
    tags: ['Learning'],
    category: 'Technology',
    meta_description: 'A concise search description.',
    image_prompt: 'An educational illustration.',
  });
}

describe('parseAndValidateArticle', () => {
  it('parses and sanitizes a valid article', async () => {
    const article = await parseAndValidateArticle(
      validArticle(`<h2>Learning</h2><p>${'knowledge '.repeat(850)}</p><script>alert(1)</script>`),
    );

    expect(article.title).toBe('A useful educational title');
    expect(article.content_html).not.toContain('<script>');
    expect(article.content_markdown).toContain('## Learning');
    expect(article.content_markdown).not.toContain('<h2>');
  });

  it('rejects invalid JSON', async () => {
    await expect(parseAndValidateArticle('not json')).rejects.toThrow();
  });

  it('rejects article bodies outside the requested word count', async () => {
    await expect(
      parseAndValidateArticle(validArticle('<p>Too short.</p>')),
    ).rejects.toThrow('Article body must be 800-1,200 words');
  });
});
