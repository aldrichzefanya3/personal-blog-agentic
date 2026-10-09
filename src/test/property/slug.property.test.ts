// src/test/property/slug.property.test.ts
// Property-based tests for CP-1: Slug Idempotence
// **Validates: Requirements 3.9, 11.1, 12.1, 12.2**

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { generateSlug } from '@/lib/slug';

/**
 * Property 1: Slug Idempotence
 *
 * For any string `title`, applying `generateSlug` twice SHALL produce
 * the same result as applying it once.
 *
 * Formally: generateSlug(generateSlug(title)) === generateSlug(title)
 *
 * This property ensures that slug generation is stable and deterministic.
 * Once a string has been converted to a slug, further applications of the
 * function don't change the result.
 */
describe('CP-1: Slug Idempotence', () => {
  /**
   * **Validates: Requirements 3.9, 11.1, 12.1, 12.2**
   *
   * For any arbitrary string input (including empty strings, special characters,
   * unicode, whitespace, etc.), applying generateSlug twice must produce the
   * same result as applying it once.
   */
  it('generateSlug applied twice equals applied once for any string', () => {
    fc.assert(
      fc.property(fc.string(), (title) => {
        const slugOnce = generateSlug(title);
        const slugTwice = generateSlug(slugOnce);
        return slugTwice === slugOnce;
      }),
      { numRuns: 1000 },
    );
  });
});

/**
 * Property 2: Slug Character Invariant
 *
 * For any string `title`, if `generateSlug(title)` produces a non-empty slug,
 * then that slug SHALL match the pattern /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/
 * and SHALL NOT contain consecutive hyphens (--).
 *
 * This property ensures that:
 * - Slugs only contain lowercase alphanumeric characters and single hyphens
 * - Slugs start and end with alphanumeric characters (or are single char)
 * - No consecutive hyphens appear in the output
 *
 * These constraints ensure URL-safe, human-readable, and database-compliant slugs.
 */
describe('CP-2: Slug Character Invariant', () => {
  /**
   * **Validates: Requirements 3.9, 6.12, 11.9**
   *
   * For any arbitrary string input, if the generated slug is non-empty,
   * it must match the required pattern and never contain consecutive hyphens.
   */
  it('non-empty slugs match pattern and have no consecutive hyphens', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (title) => {
        const slug = generateSlug(title);
        
        // If slug is empty, no constraints apply
        if (slug === '') return true;
        
        // Pattern: starts and ends with alphanumeric, or is single alphanumeric
        const slugPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
        const matchesPattern = slugPattern.test(slug);
        
        // Must not contain consecutive hyphens
        const hasNoConsecutiveHyphens = !slug.includes('--');
        
        return matchesPattern && hasNoConsecutiveHyphens;
      }),
      { numRuns: 1000 },
    );
  });
});
