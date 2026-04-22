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
        matcha: {
          50:  '#fff5f7', // Sangat soft pink (hampir putih)
          100: '#ffeef2',
          200: '#ffdbe4',
          300: '#ffb3c5',
          400: '#ff85a3',
          500: '#f26d8f', // Warna utama: Soft Pink
          600: '#e04d74',
          700: '#bd395a',
          800: '#9d314d',
          900: '#832d44',
          950: '#4a1422',
        },
        sage:  '#D4A5A5', // Dusty Rose (pengganti Sage)
        cream: '#FFF9F9', // White Pink Cream
        ivory: '#FAF3F3', 
        parchment: '#F0E4E4',
        blush: '#F2A8B8', 
        rose:  '#E8879C',
        peach: '#FCE1D4',
        gold:  '#E5C396', // Champagne Gold
      },
      fontFamily: {
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
        serif:   ['var(--font-cormorant)', 'Georgia', 'serif'],
        body:    ['var(--font-dm-sans)', 'sans-serif'],
        mono:    ['var(--font-dm-mono)', 'monospace'],
      },
      animation: {
        'float-slow':   'floatSlow 6s ease-in-out infinite',
        'float-med':    'floatMed 4.5s ease-in-out infinite',
        'spin-slow':    'spin 12s linear infinite',
        'fade-up':      'fadeUp 0.7s ease-out forwards',
        'fade-in':      'fadeIn 0.5s ease-out forwards',
        'slide-left':   'slideLeft 0.5s ease-out forwards',
        'slide-right':  'slideRight 0.5s ease-out forwards',
        'scale-in':     'scaleIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
        'marquee':      'marquee 20s linear infinite',
        'pulse-soft':   'pulseSoft 3s ease-in-out infinite',
        'shimmer':      'shimmer 2.5s ease-in-out infinite',
      },
      keyframes: {
        floatSlow: {
          '0%,100%': { transform: 'translateY(0) rotate(-2deg)' },
          '50%':     { transform: 'translateY(-18px) rotate(2deg)' },
        },
        floatMed: {
          '0%,100%': { transform: 'translateY(0) rotate(1deg)' },
          '50%':     { transform: 'translateY(-12px) rotate(-1deg)' },
        },
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(24px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        slideLeft: {
          from: { opacity: 0, transform: 'translateX(40px)' },
          to:   { opacity: 1, transform: 'translateX(0)' },
        },
        slideRight: {
          from: { opacity: 0, transform: 'translateX(-40px)' },
          to:   { opacity: 1, transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.85)' },
          to:   { opacity: 1, transform: 'scale(1)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: 1 },
          '50%':     { opacity: 0.6 },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      backgroundImage: {
        'matcha-mesh': `
          radial-gradient(at 0% 0%, #ffdbe4 0%, transparent 50%),
          radial-gradient(at 100% 0%, #ffeef2 0%, transparent 50%),
          radial-gradient(at 50% 100%, #fff5f7 0%, transparent 60%)
        `,
        'warm-mesh': `
          radial-gradient(at 30% 20%, #ffeef2 0%, transparent 50%),
          radial-gradient(at 80% 80%, #F2A8B8 0%, transparent 40%),
          radial-gradient(at 60% 50%, #FFF9F9 0%, transparent 60%)
        `,
      },
      boxShadow: {
        'soft':     '0 4px 24px rgba(0,0,0,0.06)',
        'medium':   '0 8px 40px rgba(0,0,0,0.10)',
        'strong':   '0 16px 60px rgba(0,0,0,0.15)',
        'matcha':   '0 8px 32px rgba(242,109,143,0.25)', // Shadow pink
        'card':     '0 2px 12px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)',
        'hover':    '0 16px 48px rgba(0,0,0,0.14)',
        'inset-sm': 'inset 0 1px 3px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}