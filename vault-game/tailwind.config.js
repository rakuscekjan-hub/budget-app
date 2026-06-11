/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#0D0F1A',
          panel: '#151829',
          panel2: '#1C2038',
          gold: '#F5C842',
          rare: '#8B5CF6',
          legendary: '#F97316',
          hp: '#EF4444',
          xp: '#38BDF8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
        chestWobble: {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
          '20%': { transform: 'rotate(-6deg) scale(1.05)' },
          '40%': { transform: 'rotate(6deg) scale(1.08)' },
          '60%': { transform: 'rotate(-4deg) scale(1.12)' },
          '80%': { transform: 'rotate(4deg) scale(1.15)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '70%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-48px)', opacity: '0' },
        },
        particle: {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
          '100%': { transform: 'translate(var(--px), var(--py)) scale(0)', opacity: '0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px var(--glow-color)' },
          '50%': { boxShadow: '0 0 32px var(--glow-color)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        shake: 'shake 0.25s ease-in-out',
        chestWobble: 'chestWobble 1.6s ease-in-out',
        popIn: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        floatUp: 'floatUp 0.9s ease-out forwards',
        particle: 'particle 0.9s ease-out forwards',
        glowPulse: 'glowPulse 1.8s ease-in-out infinite',
        slideUp: 'slideUp 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
}
