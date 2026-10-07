# Design System Foundation

This directory contains the design system foundation for the personal blog platform, including custom color palettes, typography scales, spacing utilities, and animation libraries.

## Files

- **`design-tokens.css`** — Custom color palette with comprehensive scales and semantic tokens
- **`animations.css`** — Reusable animations and transitions for modern UX

## Quick Start

The design system is automatically imported via `src/app/globals.css`. All utilities are available throughout the application via Tailwind CSS classes and CSS custom properties.

### Using Colors

```tsx
// Tailwind classes
<div className="bg-primary-600 text-white">Primary button</div>
<div className="text-secondary-700">Secondary text</div>

// CSS custom properties
<div style={{ backgroundColor: 'var(--color-button-primary-bg)' }}>Button</div>
```

### Using Typography

```tsx
// Display text
<h1 className="text-display font-serif">Hero Headline</h1>

// Heading hierarchy
<h1 className="text-h1 font-serif">Page Title</h1>
<h2 className="text-h2 font-serif">Section Title</h2>

// Body text
<p className="text-body">Regular paragraph text</p>
<p className="text-body-lg">Larger body text</p>
<p className="text-caption">Caption or metadata</p>
```

### Using Animations

```tsx
// Entrance animations
<div className="animate-fade-up">Content fades up on load</div>
<div className="animate-slide-in-left">Content slides in from left</div>

// Hover effects
<div className="hover-lift">Lifts on hover</div>
<div className="hover-scale">Scales on hover</div>

// Loading states
<div className="animate-skeleton">Skeleton loading placeholder</div>
<div className="animate-pulse-soft">Pulsing loader</div>
```

## Color Palette

### Primary — Deep Teal
Modern, professional color used for navigation, links, primary buttons, and headings.
- Range: `primary-50` to `primary-950`
- Main: `primary-600` (#0891b2)

### Secondary — Warm Amber
Complementary color used for accents, highlights, and CTAs.
- Range: `secondary-50` to `secondary-950`
- Main: `secondary-500` (#f59e0b)

### Accent — Vibrant Purple
Attention-grabbing color for special features, badges, and notifications.
- Range: `accent-50` to `accent-950`
- Main: `accent-600` (#9333ea)

### Semantic Colors
- **Success** (green): `success-50` to `success-950`
- **Warning** (orange): `warning-50` to `warning-950`
- **Error** (red): `error-50` to `error-950`
- **Info** (blue): `info-50` to `info-950`

### Semantic Tokens
Contextual tokens that adapt to light/dark mode:
- `--color-background` — Page background
- `--color-text` — Primary text color
- `--color-text-secondary` — Secondary text
- `--color-link` — Link color
- `--color-border` — Border color
- And many more...

## Typography

### Font Families
- **Serif (Merriweather)** — Used for headings and display text
- **Sans-serif (Inter)** — Used for body text and UI elements

### Type Scale
All sizes meet the minimum 16px base size requirement (Requirement 4.7).

| Class | Size | Usage |
|-------|------|-------|
| `text-display` | 60px | Hero sections, landing pages |
| `text-h1` | 40px | Page titles |
| `text-h2` | 32px | Section titles |
| `text-h3` | 28px | Subsection titles |
| `text-h4` | 24px | Card titles |
| `text-h5` | 20px | Small headings |
| `text-h6` | 18px | Inline headings |
| `text-body` | 16px | Body text (default) |
| `text-body-lg` | 18px | Emphasized body text |
| `text-body-sm` | 14px | De-emphasized body text |
| `text-caption` | 12px | Image captions, metadata |

### Line Height & Letter Spacing
All type sizes include optimized line-height and letter-spacing values for readability.

## Spacing

Consistent spacing scale extending Tailwind defaults:
- Standard Tailwind: `space-0` to `space-96`
- Extended: `space-18`, `space-22`, `space-26`, `space-30`, `space-34`, `space-38`, `space-42`, `space-46`, `space-50`

### Container Widths
- `max-w-container-xs` — 576px
- `max-w-container-sm` — 640px
- `max-w-container-md` — 768px
- `max-w-container-lg` — 1024px
- `max-w-container-xl` — 1280px
- `max-w-container-2xl` — 1536px
- `max-w-prose` — 65ch (optimal reading width)

## Animations

### Entrance Animations
All kept under 300ms for responsiveness:
- `animate-fade-in` — Simple fade entrance (200ms)
- `animate-fade-up` — Fade while sliding up (250ms)
- `animate-fade-down` — Fade while sliding down (250ms)
- `animate-slide-in-left` — Slide from left (250ms)
- `animate-slide-in-right` — Slide from right (250ms)
- `animate-scale-in` — Zoom entrance (200ms)

### Staggered Animations
Add sequential delays to groups of elements:
- `animate-stagger-1` — 50ms delay
- `animate-stagger-2` — 100ms delay
- `animate-stagger-3` — 150ms delay
- `animate-stagger-4` — 200ms delay
- `animate-stagger-5` — 250ms delay

### Hover Effects
- `hover-lift` — Lifts element 2px on hover
- `hover-scale` — Scales to 102% on hover
- `hover-glow` — Adds glow shadow on hover

### Loading States
- `animate-skeleton` — Shimmering skeleton loader
- `animate-spin-slow` — 1s rotation (for spinners)
- `animate-pulse-soft` — Gentle pulsing effect

### Easing Curves
- `ease-smooth` — Smooth ease curve (default)
- `ease-bounce` — Bouncy entrance
- `ease-spring` — Spring-like motion
- `ease-out-expo` — Exponential ease-out

### Focus States
All interactive elements include accessible focus indicators:
- `focus-ring` — 3:1 contrast focus outline (WCAG AA)

## Accessibility

### WCAG Compliance (Requirement 4.3)
- All color combinations meet **WCAG AA** contrast ratios:
  - **4.5:1** for normal text
  - **3:1** for large text (18pt+)
- Focus indicators meet **3:1** contrast ratio requirement (Requirement 4.4)

### Dark Mode
- Automatic switching via `prefers-color-scheme` media query
- All semantic tokens automatically adjust
- Maintains WCAG AA contrast in both modes

### Reduced Motion
- Respects `prefers-reduced-motion: reduce`
- Disables animations for users with motion sensitivity

## Usage Examples

### Hero Section
```tsx
<section className="py-24 bg-gradient-to-br from-primary-50 to-primary-100">
  <div className="max-w-container-lg mx-auto px-6">
    <h1 className="text-display font-serif text-primary-900 mb-6 animate-fade-down">
      Welcome to My Blog
    </h1>
    <p className="text-body-lg text-primary-700 mb-8 animate-fade-up animate-stagger-1">
      Sharing thoughts on technology, design, and life.
    </p>
    <button className="px-8 py-4 bg-[var(--color-button-primary-bg)] text-white rounded-lg font-semibold hover-lift transition-smooth focus-ring">
      Get Started
    </button>
  </div>
</section>
```

### Blog Post Card
```tsx
<article className="p-6 bg-[var(--color-background-elevated)] rounded-lg shadow-md hover-lift transition-smooth">
  <h2 className="text-h4 font-serif text-primary-600 mb-2 hover:text-primary-700">
    Blog Post Title
  </h2>
  <p className="text-body-sm text-[var(--color-text-secondary)] mb-4">
    Published on January 1, 2024
  </p>
  <p className="text-body text-[var(--color-text)]">
    Post excerpt goes here...
  </p>
  <div className="mt-4 flex gap-2">
    <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-caption font-medium">
      Technology
    </span>
    <span className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-caption font-medium">
      Design
    </span>
  </div>
</article>
```

### Loading State
```tsx
<div className="space-y-4">
  <div className="h-8 bg-neutral-200 rounded animate-skeleton"></div>
  <div className="h-4 bg-neutral-200 rounded animate-skeleton"></div>
  <div className="h-4 bg-neutral-200 rounded animate-skeleton w-3/4"></div>
</div>
```

## Demo Page

View the complete design system in action at `/design-system-demo`.

## Customization

To customize the design system:

1. **Colors**: Edit color values in `design-tokens.css`
2. **Typography**: Update font families and sizes in `tailwind.config.ts`
3. **Animations**: Add new keyframes in `animations.css`
4. **Spacing**: Extend the spacing scale in `tailwind.config.ts`

## Best Practices

1. **Use semantic tokens** instead of direct color values when possible
2. **Follow the type hierarchy** for consistent visual hierarchy
3. **Apply animations sparingly** to avoid overwhelming users
4. **Test in both light and dark modes** before deploying
5. **Verify keyboard navigation** works with focus indicators
6. **Check color contrast** with browser dev tools

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 14+, Chrome Android latest

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Google Fonts](https://fonts.google.com/)
