/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  // Dark mode via data attribute (managed by ThemeProvider)
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      // -----------------------------------------------------------------------
      // COLORS — mapped to CSS custom properties from styles/globals.css
      // Use these as Tailwind classes: bg-bg-base, text-primary, border-border, etc.
      // -----------------------------------------------------------------------
      colors: {
        // Background scale
        bg: {
          base: 'var(--color-bg-base)',
          elevated: 'var(--color-bg-elevated)',
          surface: 'var(--color-bg-surface)',
          overlay: 'var(--color-bg-overlay)',
        },
        // Border
        border: {
          DEFAULT: 'var(--color-border)',
          accent: 'var(--color-border-accent)',
          focus: 'var(--color-border-focus)',
        },
        // Text
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          disabled: 'var(--color-text-disabled)',
        },
        // Brand primary
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          muted: 'var(--color-primary-muted)',
          glow: 'var(--color-primary-glow)',
        },
        // Accent
        amber: {
          DEFAULT: 'var(--color-accent-amber)',
          muted: 'var(--color-accent-amber-muted)',
        },
        emerald: {
          DEFAULT: 'var(--color-accent-emerald)',
          muted: 'var(--color-accent-emerald-muted)',
        },
        rose: {
          DEFAULT: 'var(--color-accent-rose)',
          muted: 'var(--color-accent-rose-muted)',
        },
        violet: {
          DEFAULT: 'var(--color-accent-violet)',
          muted: 'var(--color-accent-violet-muted)',
        },
        // Semantic
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',
      },

      // -----------------------------------------------------------------------
      // TYPOGRAPHY
      // -----------------------------------------------------------------------
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
        editorial: ['var(--font-editorial)'],
      },

      // -----------------------------------------------------------------------
      // SPACING — 8pt grid extensions
      // -----------------------------------------------------------------------
      spacing: {
        4.5: '1.125rem', // 18px
        13: '3.25rem', // 52px
        15: '3.75rem', // 60px
        18: '4.5rem', // 72px
        22: '5.5rem', // 88px
      },

      // -----------------------------------------------------------------------
      // BORDER RADIUS
      // -----------------------------------------------------------------------
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },

      // -----------------------------------------------------------------------
      // BOX SHADOWS
      // -----------------------------------------------------------------------
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        'glow-primary': 'var(--shadow-glow-primary)',
        'glow-amber': 'var(--shadow-glow-amber)',
        'glow-emerald': 'var(--shadow-glow-emerald)',
      },

      // -----------------------------------------------------------------------
      // TRANSITIONS
      // -----------------------------------------------------------------------
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        decelerate: 'var(--ease-decelerate)',
        accelerate: 'var(--ease-accelerate)',
        spring: 'var(--ease-spring)',
        bounce: 'var(--ease-bounce)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
        xslow: 'var(--duration-xslow)',
      },

      // -----------------------------------------------------------------------
      // ANIMATIONS (referenced from src/styles/animations.css)
      // -----------------------------------------------------------------------
      animation: {
        'fade-in': 'fadeIn var(--duration-slow) var(--ease-decelerate) both',
        'fade-in-up': 'fadeInUp var(--duration-slow) var(--ease-decelerate) both',
        'fade-in-scale': 'fadeInScale var(--duration-slow) var(--ease-spring) both',
        'slide-left': 'slideInLeft var(--duration-slow) var(--ease-decelerate) both',
        'slide-right': 'slideInRight var(--duration-slow) var(--ease-decelerate) both',
        'pop-in': 'popIn var(--duration-slow) var(--ease-spring) both',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        'streak-pulse': 'streakPulse 1.5s ease-in-out infinite',
      },

      // -----------------------------------------------------------------------
      // LAYOUT
      // -----------------------------------------------------------------------
      width: {
        sidebar: 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-collapsed-width)',
      },
      height: {
        topbar: 'var(--topbar-height)',
        subnav: 'var(--workspace-subnav-height)',
      },
      maxWidth: {
        content: 'var(--content-max-width)',
      },
    },
  },
  plugins: [],
};
