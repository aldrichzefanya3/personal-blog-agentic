/**
 * Custom rehype-sanitize schema for user-supplied Markdown content.
 *
 * Security goals:
 *  1. Strip all on* event-handler attributes (onerror, onclick, onload, …)
 *  2. Allow only http/https protocols in href and src — blocks javascript: and data: URIs
 *  3. Completely remove <script>, <style>, <iframe>, <object>, and <embed> elements
 *     (and their children) rather than just unwrapping them
 */

import { defaultSchema, type Schema } from 'hast-util-sanitize';

/**
 * Tags to strip entirely (element + all descendants removed from the tree).
 * These are dangerous regardless of their attributes.
 */
const STRIPPED_TAGS = ['script', 'style', 'iframe', 'object', 'embed'];

/**
 * Build the global attribute allowlist from defaultSchema, then strip every
 * property whose camelCase name starts with "on" (event handlers).
 *
 * hast-util-sanitize uses camelCase property names (e.g. "onLoad", "onClick"),
 * so we filter by /^on/i.
 */
const defaultGlobalAttrs = (defaultSchema.attributes ?? {})['*'] ?? [];
// PropertyDefinition is not re-exported from the package top level, so we
// borrow the element type directly from the existing array.
type AttrDef = (typeof defaultGlobalAttrs)[number];

const safeGlobalAttributes: AttrDef[] = defaultGlobalAttrs.filter((attr) => {
  const name = Array.isArray(attr) ? attr[0] : attr;
  return !String(name).match(/^on/i);
});

/**
 * sanitizeSchema — a strict superset-of-default schema that enforces the
 * security policies above.
 *
 * We spread defaultSchema so that all existing GitHub-style allowances are
 * preserved, then override only the parts we need to tighten.
 */
export const sanitizeSchema: Schema = {
  ...defaultSchema,

  // Strip dangerous elements entirely (children are also removed).
  strip: [
    ...(defaultSchema.strip ?? []),
    ...STRIPPED_TAGS.filter(
      (tag) => !(defaultSchema.strip ?? []).includes(tag),
    ),
  ],

  // Dangerous tags are not in defaultSchema.tagNames, but being explicit
  // ensures they won't accidentally pass through even if tagNames changes.
  tagNames: (defaultSchema.tagNames ?? []).filter(
    (tag) => !STRIPPED_TAGS.includes(tag),
  ),

  attributes: {
    // Spread all existing per-element attribute rules from the default schema.
    ...defaultSchema.attributes,

    // Override the <a> element: allow only href (no event handlers).
    // Protocol filtering is handled by the `protocols` key below.
    a: ['href'],

    // Override the <img> element: allow src and alt (no event handlers).
    // Protocol filtering is handled by the `protocols` key below.
    img: ['src', 'alt', 'title'],

    // Replace the global (*) attribute list with the on*-stripped version.
    '*': safeGlobalAttributes,
  },

  // Restrict URL-bearing attributes to safe protocols only.
  // This blocks javascript: and data: URIs everywhere they might appear.
  protocols: {
    ...defaultSchema.protocols,
    // Anchor hrefs: http and https only (removes mailto, irc, xmpp, etc.)
    href: ['http', 'https'],
    // Image/media src: http and https only
    src: ['http', 'https'],
    // longDesc on img: http and https only
    longDesc: ['http', 'https'],
    // cite attributes on blockquote/del/ins/q: http and https only
    cite: ['http', 'https'],
  },
};
