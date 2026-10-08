/**
 * Design System Demo Page
 * 
 * This page showcases the custom design system foundation:
 * - Custom color palette (primary, secondary, accent, semantic)
 * - Typography scale (display, headings, body, utilities)
 * - Spacing utilities
 * - Animation library
 * 
 * Navigate to /design-system-demo to view this page.
 */

export default function DesignSystemDemo() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)] p-8">
      <div className="max-w-container-xl mx-auto space-y-16">
        {/* Header */}
        <header className="animate-fade-down">
          <h1 className="text-display font-serif text-primary-600 mb-4">
            Design System Foundation
          </h1>
          <p className="text-body-lg text-[var(--color-text-secondary)] max-w-container-md">
            A comprehensive design system with custom colors, typography, spacing, and animations. 
            All components meet WCAG AA contrast ratios and support dark mode.
          </p>
        </header>

        {/* Color Palette Section */}
        <section className="animate-fade-up animate-stagger-1">
          <h2 className="text-h2 font-serif mb-8">Color Palette</h2>
          
          {/* Primary Colors */}
          <div className="mb-8">
            <h3 className="text-h4 font-serif mb-4">Primary (Teal)</h3>
            <div className="grid grid-cols-5 sm:grid-cols-11 gap-2">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => (
                <div key={shade} className="flex flex-col items-center">
                  <div 
                    className={`w-16 h-16 rounded-lg bg-primary-${shade} hover-lift shadow-md`}
                  />
                  <span className="text-caption mt-2">{shade}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Colors */}
          <div className="mb-8">
            <h3 className="text-h4 font-serif mb-4">Secondary (Amber)</h3>
            <div className="grid grid-cols-5 sm:grid-cols-11 gap-2">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => (
                <div key={shade} className="flex flex-col items-center">
                  <div 
                    className={`w-16 h-16 rounded-lg bg-secondary-${shade} hover-lift shadow-md`}
                  />
                  <span className="text-caption mt-2">{shade}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Accent Colors */}
          <div className="mb-8">
            <h3 className="text-h4 font-serif mb-4">Accent (Purple)</h3>
            <div className="grid grid-cols-5 sm:grid-cols-11 gap-2">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => (
                <div key={shade} className="flex flex-col items-center">
                  <div 
                    className={`w-16 h-16 rounded-lg bg-accent-${shade} hover-lift shadow-md`}
                  />
                  <span className="text-caption mt-2">{shade}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Semantic Colors */}
          <div>
            <h3 className="text-h4 font-serif mb-4">Semantic Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col">
                <div className="w-full h-24 rounded-lg bg-success-500 hover-lift shadow-md flex items-center justify-center text-white font-semibold">
                  Success
                </div>
              </div>
              <div className="flex flex-col">
                <div className="w-full h-24 rounded-lg bg-warning-500 hover-lift shadow-md flex items-center justify-center text-white font-semibold">
                  Warning
                </div>
              </div>
              <div className="flex flex-col">
                <div className="w-full h-24 rounded-lg bg-error-500 hover-lift shadow-md flex items-center justify-center text-white font-semibold">
                  Error
                </div>
              </div>
              <div className="flex flex-col">
                <div className="w-full h-24 rounded-lg bg-info-500 hover-lift shadow-md flex items-center justify-center text-white font-semibold">
                  Info
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Typography Section */}
        <section className="animate-fade-up animate-stagger-2">
          <h2 className="text-h2 font-serif mb-8">Typography Scale</h2>
          
          <div className="space-y-6 max-w-container-lg">
            <div>
              <p className="text-caption text-[var(--color-text-muted)] mb-2">Display</p>
              <h1 className="text-display font-serif">The quick brown fox jumps</h1>
            </div>
            
            <div>
              <p className="text-caption text-[var(--color-text-muted)] mb-2">Heading 1</p>
              <h1 className="text-h1 font-serif">The quick brown fox jumps over the lazy dog</h1>
            </div>
            
            <div>
              <p className="text-caption text-[var(--color-text-muted)] mb-2">Heading 2</p>
              <h2 className="text-h2 font-serif">The quick brown fox jumps over the lazy dog</h2>
            </div>
            
            <div>
              <p className="text-caption text-[var(--color-text-muted)] mb-2">Heading 3</p>
              <h3 className="text-h3 font-serif">The quick brown fox jumps over the lazy dog</h3>
            </div>
            
            <div>
              <p className="text-caption text-[var(--color-text-muted)] mb-2">Heading 4</p>
              <h4 className="text-h4 font-serif">The quick brown fox jumps over the lazy dog</h4>
            </div>
            
            <div>
              <p className="text-caption text-[var(--color-text-muted)] mb-2">Body Text</p>
              <p className="text-body">
                The quick brown fox jumps over the lazy dog. This is body text with optimal line height 
                and letter spacing for readability. Base font size is 16px as required.
              </p>
            </div>
            
            <div>
              <p className="text-caption text-[var(--color-text-muted)] mb-2">Body Large</p>
              <p className="text-body-lg">
                The quick brown fox jumps over the lazy dog. This is larger body text for emphasis.
              </p>
            </div>
            
            <div>
              <p className="text-caption text-[var(--color-text-muted)] mb-2">Caption & Code</p>
              <p className="text-caption">Caption text for image descriptions or metadata</p>
              <code className="text-caption">const example = &quot;inline code&quot;;</code>
            </div>
          </div>
        </section>

        {/* Animation Section */}
        <section className="animate-fade-up animate-stagger-3">
          <h2 className="text-h2 font-serif mb-8">Animations & Interactions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-[var(--color-background-elevated)] rounded-lg shadow-md hover-lift">
              <h3 className="text-h5 font-serif mb-2">Hover Lift</h3>
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                Hover over this card to see the lift effect
              </p>
            </div>
            
            <div className="p-6 bg-[var(--color-background-elevated)] rounded-lg shadow-md hover-scale">
              <h3 className="text-h5 font-serif mb-2">Hover Scale</h3>
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                Hover over this card to see the scale effect
              </p>
            </div>
            
            <div className="p-6 bg-[var(--color-background-elevated)] rounded-lg shadow-md hover-glow">
              <h3 className="text-h5 font-serif mb-2">Hover Glow</h3>
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                Hover over this card to see the glow effect
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="text-h4 font-serif">Entrance Animations</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-primary-100 rounded-lg animate-fade-in">
                <p className="text-body-sm font-semibold text-primary-800">Fade In</p>
              </div>
              <div className="p-4 bg-secondary-100 rounded-lg animate-fade-up">
                <p className="text-body-sm font-semibold text-secondary-800">Fade Up</p>
              </div>
              <div className="p-4 bg-accent-100 rounded-lg animate-slide-in-left">
                <p className="text-body-sm font-semibold text-accent-800">Slide Left</p>
              </div>
            </div>
          </div>
        </section>

        {/* Button Styles */}
        <section className="animate-fade-up animate-stagger-4">
          <h2 className="text-h2 font-serif mb-8">Buttons & CTAs</h2>
          
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-3 bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)] rounded-lg font-semibold hover:bg-[var(--color-button-primary-hover)] transition-smooth focus-ring">
              Primary Button
            </button>
            
            <button className="px-6 py-3 bg-[var(--color-button-secondary-bg)] text-[var(--color-button-secondary-text)] rounded-lg font-semibold hover:bg-[var(--color-button-secondary-hover)] transition-smooth focus-ring">
              Secondary Button
            </button>
            
            <button className="px-6 py-3 bg-accent-600 text-white rounded-lg font-semibold hover:bg-accent-700 transition-smooth focus-ring">
              Accent Button
            </button>
            
            <button className="px-6 py-3 border-2 border-[var(--color-border)] text-[var(--color-text)] rounded-lg font-semibold hover:border-primary-500 hover:text-primary-600 transition-smooth focus-ring">
              Outline Button
            </button>
          </div>
        </section>

        {/* Spacing Scale */}
        <section className="animate-fade-up animate-stagger-5">
          <h2 className="text-h2 font-serif mb-8">Spacing Scale</h2>
          
          <div className="space-y-4">
            <p className="text-body text-[var(--color-text-secondary)]">
              Consistent spacing utilities from 4px (space-1) to 200px (space-50)
            </p>
            <div className="flex flex-wrap gap-4 items-end">
              {[1, 2, 4, 8, 12, 16, 20, 24].map((size) => (
                <div key={size} className="flex flex-col items-center">
                  <div 
                    className="bg-primary-500 rounded"
                    style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
                  />
                  <span className="text-caption mt-2">{size}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-[var(--color-border)] text-center">
          <p className="text-body-sm text-[var(--color-text-muted)]">
            Design System Foundation — Built for accessibility, performance, and modern UX
          </p>
        </footer>
      </div>
    </div>
  );
}
