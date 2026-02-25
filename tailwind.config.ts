import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // EternaCloud-inspired vivid purple
        brand: {
          50:  '#f0eeff',
          100: '#e4e0ff',
          200: '#ccc5ff',
          300: '#aa9fff',
          400: '#8b7aff',
          500: '#5b4cff',
          600: '#4835e8',
          700: '#3b29c7',
          800: '#2f21a0',
          900: '#1a1245',
          950: '#0d0b23',
        },
        // Dark navy surfaces
        surface: {
          900: '#0a0814',
          800: '#0f0c1f',
          700: '#13102a',
          600: '#1a1635',
          500: '#221d42',
          400: '#2e2857',
        },
        success: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm':  '0 0 12px rgba(91,76,255,0.25)',
        'glow':     '0 0 24px rgba(91,76,255,0.35)',
        'glow-lg':  '0 0 40px rgba(91,76,255,0.45)',
        'card':     '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glow-purple': 'radial-gradient(ellipse at 50% 0%, rgba(91,76,255,0.3) 0%, transparent 70%)',
        'glow-left':   'radial-gradient(ellipse at 0% 50%,  rgba(91,76,255,0.2) 0%, transparent 60%)',
        'glow-right':  'radial-gradient(ellipse at 100% 50%, rgba(180,100,255,0.15) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
}

export default config
