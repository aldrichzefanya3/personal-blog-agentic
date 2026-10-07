import { describe, it, expect, vi } from 'vitest';
import { generateSlug, ensureUniqueSlug } from '@/lib/slug';

// Requirements: 18.1, 18.2, 18.6

describe('generateSlug', () => {
  it('lowercases and hyphenates a basic title', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('converts a single word title', () => {
    expect(generateSlug('TypeScript')).toBe('typescript');
  });

  it('normalizes diacritics — é → e', () => {
    expect(generateSlug('Héllo Wörld')).toBe('hello-world');
  });

  it('normalizes diacritics — à, ñ, ü, ç', () => {
    expect(generateSlug('Ñoño àla ü çafe')).toBe('nono-ala-u-cafe');
  });

  it('normalizes combined diacritics — café', () => {
    expect(generateSlug('café')).toBe('cafe');
  });

  it('removes special characters', () => {
    expect(generateSlug('Hello! World?')).toBe('hello-world');
  });

  it('removes punctuation and symbols', () => {
    expect(generateSlug('C++ is great & cool.')).toBe('c-is-great-cool');
  });

  it('collapses multiple spaces into a single hyphen', () => {
    expect(generateSlug('hello   world')).toBe('hello-world');
  });

  it('collapses multiple hyphens into a single hyphen', () => {
    expect(generateSlug('hello---world')).toBe('hello-world');
  });

  it('collapses mixed spaces and hyphens into a single hyphen', () => {
    expect(generateSlug('hello - world')).toBe('hello-world');
  });

  it('trims leading hyphens', () => {
    expect(generateSlug('--hello world')).toBe('hello-world');
  });

  it('trims trailing hyphens', () => {
    expect(generateSlug('hello world--')).toBe('hello-world');
  });

  it('trims leading and trailing hyphens from special char edges', () => {
    expect(generateSlug('!!! hello world !!!')).toBe('hello-world');
  });

  it('returns empty string for input with only special characters', () => {
    expect(generateSlug('!!!')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(generateSlug('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(generateSlug('   ')).toBe('');
  });

  it('handles numbers in title', () => {
    expect(generateSlug('Top 10 Tips')).toBe('top-10-tips');
  });

  it('preserves hyphens that are already in the title', () => {
    expect(generateSlug('well-known phrase')).toBe('well-known-phrase');
  });

  it('is idempotent — applying twice produces same result', () => {
    const title = 'Hello Wörld! -- check this out';
    expect(generateSlug(generateSlug(title))).toBe(generateSlug(title));
  });
});

describe('ensureUniqueSlug', () => {
  it('returns the base slug when there is no conflict', async () => {
    const existsCheck = vi.fn().mockResolvedValue(false);
    const result = await ensureUniqueSlug('my-post', existsCheck);
    expect(result).toBe('my-post');
    expect(existsCheck).toHaveBeenCalledWith('my-post', undefined);
  });

  it('appends -2 on first conflict', async () => {
    const existsCheck = vi
      .fn()
      .mockResolvedValueOnce(true) // 'my-post' exists
      .mockResolvedValueOnce(false); // 'my-post-2' is free
    const result = await ensureUniqueSlug('my-post', existsCheck);
    expect(result).toBe('my-post-2');
  });

  it('increments suffix until a free slot is found', async () => {
    const existsCheck = vi
      .fn()
      .mockResolvedValueOnce(true) // 'my-post' exists
      .mockResolvedValueOnce(true) // 'my-post-2' exists
      .mockResolvedValueOnce(true) // 'my-post-3' exists
      .mockResolvedValueOnce(false); // 'my-post-4' is free
    const result = await ensureUniqueSlug('my-post', existsCheck);
    expect(result).toBe('my-post-4');
  });

  it('passes excludeId to existsCheck so own slug is not counted as a conflict', async () => {
    const excludeId = 'uuid-123';
    // Simulate: with excludeId, 'my-post' is not a conflict (it belongs to this record)
    const existsCheck = vi.fn().mockResolvedValue(false);
    const result = await ensureUniqueSlug('my-post', existsCheck, excludeId);
    expect(result).toBe('my-post');
    expect(existsCheck).toHaveBeenCalledWith('my-post', excludeId);
  });

  it('with excludeId still finds next free slug when a different record holds the base slug', async () => {
    const excludeId = 'uuid-123';
    const existsCheck = vi
      .fn()
      .mockResolvedValueOnce(true) // 'my-post' is taken by another record
      .mockResolvedValueOnce(false); // 'my-post-2' is free
    const result = await ensureUniqueSlug('my-post', existsCheck, excludeId);
    expect(result).toBe('my-post-2');
    expect(existsCheck).toHaveBeenNthCalledWith(1, 'my-post', excludeId);
    expect(existsCheck).toHaveBeenNthCalledWith(2, 'my-post-2', excludeId);
  });

  it('throws when all suffixes through -999 are taken', async () => {
    // base slug + 998 suffixes (-2 … -999) = 999 calls, all returning true
    const existsCheck = vi.fn().mockResolvedValue(true);
    await expect(ensureUniqueSlug('my-post', existsCheck)).rejects.toThrow(
      'Could not generate unique slug for base: my-post',
    );
    // Called once for 'my-post', then once each for 'my-post-2' through 'my-post-999' = 999 total
    expect(existsCheck).toHaveBeenCalledTimes(999);
  });
});
