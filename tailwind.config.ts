import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        institucional: {
          950: '#050B1A',
          900: '#0B1633',
          800: '#12224D',
          700: '#193076',
          600: '#1E4DB0',
          500: '#3566D6',
          400: '#6D93E8',
          100: '#E4ECFB',
        },
        superficie: {
          0: '#FFFFFF',
          50: '#F7F9FC',
          100: '#EEF2F7',
          200: '#E1E7EF',
          300: '#CBD3DF',
          400: '#98A2B3',
          600: '#475467',
          900: '#101828',
        },
        disponible: { 100: '#E0FBFF', 500: '#06AED4', 700: '#0E7490' },
        ocupada: { 100: '#FEECEB', 500: '#F0453B', 700: '#B42318' },
        limpieza: { 100: '#FEF6E7', 500: '#F5A524', 700: '#B54708' },
        reservada: { 100: '#F1EEFE', 500: '#7C5CFC', 700: '#5B3DD1' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { card: '0.875rem' },
      boxShadow: { card: '0 1px 2px 0 rgb(16 24 40 / 0.06), 0 1px 3px 0 rgb(16 24 40 / 0.08)' },
      minHeight: { touch: '48px' },
    },
  },
  plugins: [],
} satisfies Config;
