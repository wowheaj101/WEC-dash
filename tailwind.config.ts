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
        /* ── Base tokens (mapped via CSS vars) ── */
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

        /* ── Broadcast surfaces (bg-0 … bg-4) ── */
        bg0:         'hsl(var(--bg-0))',
        bg1:         'hsl(var(--bg-1))',
        bg2:         'hsl(var(--bg-2))',
        bg3:         'hsl(var(--bg-3))',
        bg4:         'hsl(var(--bg-4))',
        surface1:    'hsl(var(--bg-1))',
        surface2:    'hsl(var(--bg-2))',
        surface3:    'hsl(var(--bg-3))',

        /* ── Foreground scale ── */
        fg0:         'hsl(var(--fg-0))',
        fg1:         'hsl(var(--fg-1))',
        fg2:         'hsl(var(--fg-2))',
        fg3:         'hsl(var(--fg-3))',
        fg4:         'hsl(var(--fg-4))',

        /* ── Line weights ── */
        line1:       'hsl(var(--line-1))',
        line2:       'hsl(var(--line-2))',
        line3:       'hsl(var(--line-3))',

        /* ── Racing class colors ── */
        hypercar:    'hsl(var(--hypercar))',
        lmp2:        'hsl(var(--lmp2))',
        lmgt3:       'hsl(var(--lmgt3))',
        fastest:     'hsl(var(--fastest))',

        /* ── Status / flag colors ── */
        pit:         'hsl(var(--pit))',
        live:        'hsl(var(--live))',
        warning:     'hsl(var(--warning))',
        danger:      'hsl(var(--danger))',
        info:        'hsl(var(--info))',

        flagGreen:   'hsl(var(--flag-green))',
        flagYellow:  'hsl(var(--flag-yellow))',
        flagRed:     'hsl(var(--flag-red))',
        flagSc:      'hsl(var(--flag-sc))',
      },
      fontFamily: {
        display: ['"Bai Jamjuree"', '"Barlow Condensed"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        cond:    ['"Barlow Condensed"', '"Bai Jamjuree"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        ui:      ['"Bai Jamjuree"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) + 2px)',
        sm: '2px',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.15' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.35' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        'dot-blink':      'blink 1.2s ease-in-out infinite',
        'dot-blink-slow': 'blink 2.4s ease-in-out infinite',
        'pulse-soft':     'pulse-soft 1.4s ease-in-out infinite',
        'fade-in':        'fade-in 0.2s ease-out',
        'slide-in':       'slide-in 0.15s ease-out',
        ticker:           'ticker 60s linear infinite',
        shimmer:          'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
