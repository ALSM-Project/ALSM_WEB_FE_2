/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8F1FF',
          100: '#D2E3FF',
          200: '#A5C7FF',
          300: '#78ABFF',
          400: '#4B8FFF',
          500: '#1E73FF',
          600: '#0652CC',
          700: '#003F99',
          800: '#002C66',
          900: '#001933',
        },
        navy: {
          800: '#091E42',
          900: '#020817',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
