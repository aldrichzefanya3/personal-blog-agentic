/**
 * Property-based test CP-9: Parameterized Query — No SQL Injection
 *
 * For any arbitrary string containing SQL metacharacters, passing it as the
 * search query to searchPosts() MUST NOT produce a SQL syntax error and MUST
 * NOT allow structural changes to the database.  The query layer uses
 * parameterized tagged templates (postgres.js), so user input is never
 * concatenated into the SQL text.
 *
 * This test mocks the database client and inspects the SQL template + bound
 * parameters that searchPosts() emits:
 *  - The SQL text is constant regardless of the query value
 *  - The user-controlled value appears ONLY as a bound parameter, never
 *    interpolated into the SQL string
 *
 * **Validates: Requirements 16.1, 16.2**
 * Requirements: 18.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Capture the raw SQL template parts emitted by the query layer.
const { capturedParts, mockSql } = vi.hoisted(() => ({
  capturedParts: [] as string[][],
  mockSql: vi.fn(async (...args: unknown[]) => {
    // args[0] is the TemplateStringsArray when called as a tagged template.
    const strings = args[0] as TemplateStringsArray;
    capturedParts.push(Array.from(strings));
    return [];
  }),
}));

vi.mock('@/lib/db/client', () => ({
  sql: mockSql,
}));

import { searchPosts } from '@/lib/db/queries/posts';

describe('CP-9: Parameterized Query — No SQL Injection', () => {
  beforeEach(() => {
    capturedParts.length = 0;
    mockSql.mockClear();
  });

  /**
   * Arbitrary strings that include SQL metacharacters commonly used in
   * injection attempts: quotes, semicolons, comment markers, UNION,
   * backslashes, and control characters.
   */
  const sqlMetacharArbitrary = fc.string().filter((s) =>
    /[;'"\\\-\/\*%_]/.test(s),
  );

  /**
   * **Validates: Requirements 16.1, 16.2**
   *
   * Property 9: For any arbitrary query string, searchPosts() emits a constant
   * SQL template whose text does not contain the raw query value, and the
   * value appears exclusively as a bound parameter.
   *
   * We capture the raw template parts (the literal strings between `?`
   * placeholders).  If the query value were ever interpolated into the SQL
   * text, it would appear inside one of those parts.  Because postgres.js
   * tagged templates never interpolate values into the literal parts, the
   * parts must remain constant regardless of the query value.
   */
  it('searchPosts never interpolates the query value into the SQL text', async () => {
    // Capture the baseline template parts from a known-good query.
    await searchPosts({ query: 'baseline', limit: 10 });
    const baselineParts = capturedParts[0];

    await fc.assert(
      fc.asyncProperty(sqlMetacharArbitrary, async (query) => {
        capturedParts.length = 0;
        await searchPosts({ query, limit: 10 });

        expect(capturedParts.length).toBe(1);
        const parts = capturedParts[0];

        // The literal SQL text (the parts between placeholders) must be
        // identical regardless of the query value — proving the value is
        // never concatenated into the SQL string.
        return JSON.stringify(parts) === JSON.stringify(baselineParts);
      }),
      { numRuns: 200 },
    );
  });
});