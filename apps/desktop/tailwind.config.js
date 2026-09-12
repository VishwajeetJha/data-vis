/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        ui: ['var(--font-ui)', 'sans-serif'],
        reading: ['var(--font-reading)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        border: 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        background: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        elevated: 'var(--bg-elevated)',
        primary: {
          DEFAULT: 'var(--text-primary)',
          hover: 'var(--text-primary)',
          subtle: 'var(--bg-subtle)',
        },
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          subtle: 'var(--color-accent-subtle)',
        },
        'graph-bg': 'var(--graph-bg)',
        'graph-grid': 'var(--graph-grid)',
      },
      maxWidth: {
        reading: 'var(--reading-width)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};
