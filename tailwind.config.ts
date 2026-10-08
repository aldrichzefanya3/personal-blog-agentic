import type { Config } from 'tailwindcss';
import tailwindTypography from '@tailwindcss/typography';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  // Dark mode is controlled by the root .dark class.
  darkMode: 'class',

  // Content paths covering all components and pages
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './src/styles/**/*.css',
  ],

  theme: {
    extend: {
      /* ============================================
         CUSTOM COLOR PALETTE
         Defined in src/styles/design-tokens.css
         ============================================ */
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          950: 'var(--color-primary-950)',
        },
        secondary: {
          50: 'var(--color-secondary-50)',
          100: 'var(--color-secondary-100)',
          200: 'var(--color-secondary-200)',
          300: 'var(--color-secondary-300)',
          400: 'var(--color-secondary-400)',
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)',
          700: 'var(--color-secondary-700)',
          800: 'var(--color-secondary-800)',
          900: 'var(--color-secondary-900)',
          950: 'var(--color-secondary-950)',
        },
        accent: {
          50: 'var(--color-accent-50)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
          800: 'var(--color-accent-800)',
          900: 'var(--color-accent-900)',
          950: 'var(--color-accent-950)',
        },
        success: {
          50: 'var(--color-success-50)',
          100: 'var(--color-success-100)',
          200: 'var(--color-success-200)',
          300: 'var(--color-success-300)',
          400: 'var(--color-success-400)',
          500: 'var(--color-success-500)',
          600: 'var(--color-success-600)',
          700: 'var(--color-success-700)',
          800: 'var(--color-success-800)',
          900: 'var(--color-success-900)',
          950: 'var(--color-success-950)',
        },
        warning: {
          50: 'var(--color-warning-50)',
          100: 'var(--color-warning-100)',
          200: 'var(--color-warning-200)',
          300: 'var(--color-warning-300)',
          400: 'var(--color-warning-400)',
          500: 'var(--color-warning-500)',
          600: 'var(--color-warning-600)',
          700: 'var(--color-warning-700)',
          800: 'var(--color-warning-800)',
          900: 'var(--color-warning-900)',
          950: 'var(--color-warning-950)',
        },
        error: {
          50: 'var(--color-error-50)',
          100: 'var(--color-error-100)',
          200: 'var(--color-error-200)',
          300: 'var(--color-error-300)',
          400: 'var(--color-error-400)',
          500: 'var(--color-error-500)',
          600: 'var(--color-error-600)',
          700: 'var(--color-error-700)',
          800: 'var(--color-error-800)',
          900: 'var(--color-error-900)',
          950: 'var(--color-error-950)',
        },
        info: {
          50: 'var(--color-info-50)',
          100: 'var(--color-info-100)',
          200: 'var(--color-info-200)',
          300: 'var(--color-info-300)',
          400: 'var(--color-info-400)',
          500: 'var(--color-info-500)',
          600: 'var(--color-info-600)',
          700: 'var(--color-info-700)',
          800: 'var(--color-info-800)',
          900: 'var(--color-info-900)',
          950: 'var(--color-info-950)',
        },
      },

      /* ============================================
         TYPOGRAPHY SCALE
         Comprehensive scale with semantic names
         Requirement 4.7: Base font size ≥ 16px
         ============================================ */
      fontFamily: {
        serif: ['Merriweather', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Base size (requirement 4.7)
        base: ['1rem', { lineHeight: '1.75', letterSpacing: '0' }], // 16px
        
        // Display sizes (hero sections, landing pages)
        display: ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }], // 60px
        'display-sm': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }], // 48px
        
        // Heading scale
        h1: ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }], // 40px
        h2: ['2rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }], // 32px
        h3: ['1.75rem', { lineHeight: '1.3', letterSpacing: '-0.005em' }], // 28px
        h4: ['1.5rem', { lineHeight: '1.35', letterSpacing: '0' }], // 24px
        h5: ['1.25rem', { lineHeight: '1.4', letterSpacing: '0' }], // 20px
        h6: ['1.125rem', { lineHeight: '1.5', letterSpacing: '0' }], // 18px
        
        // Body text
        body: ['1rem', { lineHeight: '1.75', letterSpacing: '0' }], // 16px
        'body-lg': ['1.125rem', { lineHeight: '1.75', letterSpacing: '0' }], // 18px
        'body-sm': ['0.875rem', { lineHeight: '1.6', letterSpacing: '0' }], // 14px
        
        // Utility text
        caption: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.01em' }], // 12px
        overline: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.1em' }], // 12px, uppercase
      },

      /* ============================================
         SPACING SCALE
         Extended consistent spacing for layouts
         ============================================ */
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
        '34': '8.5rem',   // 136px
        '38': '9.5rem',   // 152px
        '42': '10.5rem',  // 168px
        '46': '11.5rem',  // 184px
        '50': '12.5rem',  // 200px
      },

      /* ============================================
         LAYOUT CONTAINERS
         Max-width utilities for content areas
         ============================================ */
      maxWidth: {
        'container-xs': '36rem',   // 576px
        'container-sm': '40rem',   // 640px
        'container-md': '48rem',   // 768px
        'container-lg': '64rem',   // 1024px
        'container-xl': '80rem',   // 1280px
        'container-2xl': '96rem',  // 1536px
        'prose': '65ch',           // Optimal reading width
      },

      /* ============================================
         RESPONSIVE BREAKPOINTS
         Standard breakpoints for responsive design
         ============================================ */
      screens: {
        'xs': '475px',
        // sm: 640px (default)
        // md: 768px (default)
        // lg: 1024px (default)
        // xl: 1280px (default)
        // 2xl: 1536px (default)
      },

      /* ============================================
         ANIMATION TIMING
         ============================================ */
      transitionDuration: {
        '50': '50ms',
        '150': '150ms',
        '250': '250ms',
      },

      /* ============================================
         BOX SHADOW SCALE
         Subtle to prominent elevation
         ============================================ */
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'DEFAULT': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'md': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'lg': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '2xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
      },
    },
  },

  plugins: [
    tailwindTypography,
    plugin(({ addComponents }) => {
      addComponents({
        '.prose-blog': {
          '--tw-prose-body': 'var(--color-text)',
          '--tw-prose-headings': 'var(--color-text)',
          '--tw-prose-links': 'var(--color-link)',
          '--tw-prose-bold': 'var(--color-text)',
          '--tw-prose-code': 'var(--color-code-text)',
          '--tw-prose-pre-bg': 'var(--color-code-bg)',
          '--tw-prose-quotes': 'var(--color-text-secondary)',
          'font-size': '1.125rem',
          'line-height': '1.75',
          'max-width': '65ch',
        },
      });
    }),
  ],
};

export default config;
