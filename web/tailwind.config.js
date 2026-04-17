/** @type {import('tailwindcss').Config} */
// Pelayo Wellness — luxury boutique gym tokens.
// Source of truth: web/docs/brand.md
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Base surfaces
        onyx: '#0B0B0D',
        espresso: '#1A1715',
        clay: '#24201C',
        ash: '#2A2724',
        // Text
        ivory: '#F4EDE4',
        oat: '#C8BFB2',
        stone: '#8A8278',
        // Accents
        brass: {
          DEFAULT: '#B08D57',
          gilt: '#D4AE74',
          shade: '#8B6E42',
        },
        terracotta: '#9A6B52',
        moss: '#4A5842',
        // Semantic
        rust: '#B4513A',
        olive: '#7A8560',
      },
      fontFamily: {
        // Paid upgrade path documented in brand.md; these are the free fallbacks.
        display: ['"Playfair Display"', 'Canela Deck', 'Migra', 'Georgia', 'serif'],
        sans: ['Inter', '"Söhne"', '"GT America"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        eyebrow: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.12em' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        body: ['1rem', { lineHeight: '1.55' }],
        'body-lg': ['1.125rem', { lineHeight: '1.55' }],
        h3: ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.005em' }],
        h2: ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        h1: ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        display: ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.015em' }],
      },
      borderRadius: {
        sm: '2px',
        md: '4px',
        lg: '8px',
        pill: '999px',
      },
      boxShadow: {
        1: '0 1px 2px rgba(0,0,0,0.4)',
        2: '0 4px 16px rgba(0,0,0,0.4)',
        3: '0 16px 48px rgba(0,0,0,0.5)',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        180: '180ms',
        280: '280ms',
      },
      maxWidth: {
        prose: '720px',
        page: '1280px',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slowZoom: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.05)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slow-zoom': 'slowZoom 20s ease-out both',
      },
    },
  },
  plugins: [],
};
