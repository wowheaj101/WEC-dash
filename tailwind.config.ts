import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── CSS variable tokens ── */
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',

        /* ── Racing class colors ── */
        hypercar:    'hsl(var(--hypercar))',
        lmp2:        'hsl(var(--lmp2))',
        lmgt3:       'hsl(var(--lmgt3))',
        fastest:     'hsl(var(--fastest))',

        /* ── Status / flag colors ── */
        pit:         'hsl(var(--pit))',
        live:        'hsl(var(--live))',
        surface1:    'hsl(var(--surface1))',
        surface2:    'hsl(var(--surface2))',
        surface3:    'hsl(var(--surface3))',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.15' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        'dot-blink':      'blink 1.2s ease-in-out infinite',
        'dot-blink-slow': 'blink 2.4s ease-in-out infinite',
        'fade-in':        'fade-in 0.2s ease-out',
        'slide-in':       'slide-in 0.15s ease-out',
        shimmer:          'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
