/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vanilla: {
          50:  '#FFFCF5',
          100: '#FFF7E6',
          200: '#FFF0CC',
          300: '#FFE7B3',
          400: '#FFD98A',
          500: '#F5C97A',
          600: '#E8B86A',
          700: '#C9A05A',
          800: '#8A6E3E',
          900: '#4A3A1F',
          950: '#2B2112',
        },
        ink: {
          DEFAULT: '#141412',
          50:  '#F7F7F5',
          100: '#E8E8E3',
          200: '#D1D1CC',
          300: '#B5B5AF',
          400: '#9A9A94',
          500: '#7A7A76',
          600: '#5C5C59',
          700: '#3A3A38',
          800: '#1E1E1D',
          900: '#141412',
        },
        cream: '#FFFCF5',
        parchment: '#F0E8D6',
        line: '#EDE5D3',
        muted: '#8C857A',
        // compat aliases (old matcha tokens map to vanilla)
        matcha: {
          50:  '#FFFCF5',
          100: '#FFF7E6',
          200: '#FFF0CC',
          300: '#FFE7B3',
          400: '#FFD98A',
          500: '#E8B86A',
          600: '#C9A05A',
          700: '#8A6E3E',
          800: '#4A3A1F',
          900: '#2B2112',
          950: '#2B2112',
        },
      },
      fontFamily: {
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
        serif:   ['var(--font-cormorant)', 'Georgia', 'serif'],
        body:    ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-dm-mono)', 'monospace'],
      },
      boxShadow: {
        soft:   '0 2px 20px rgba(20,20,18,0.06)',
        medium: '0 8px 32px rgba(20,20,18,0.10)',
        strong: '0 16px 48px rgba(20,20,18,0.14)',
        card:   '0 1px 3px rgba(20,20,18,0.06), 0 8px 24px rgba(20,20,18,0.06)',
        hover:  '0 8px 32px rgba(20,20,18,0.12)',
        inset:  'inset 0 1px 0 rgba(255,255,255,0.8)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'float-slow': 'floatSlow 6s ease-in-out infinite',
        'float-med':  'floatMed 5s ease-in-out infinite',
        'fade-up':    'fadeUp 0.6s ease-out forwards',
        'fade-in':    'fadeIn 0.4s ease-out forwards',
        'scale-in':   'scaleIn 0.35s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
        'shimmer':    'shimmer 1.6s ease-in-out infinite',
        'marquee':    'marquee 28s linear infinite',
      },
      keyframes: {
        floatSlow: {
          '0%,100%': { transform: 'translateY(0) rotate(-1.5deg)' },
          '50%':     { transform: 'translateY(-14px) rotate(1.5deg)' },
        },
        floatMed: {
          '0%,100%': { transform: 'translateY(0) rotate(1deg)' },
          '50%':     { transform: 'translateY(-10px) rotate(-1deg)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':  { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
