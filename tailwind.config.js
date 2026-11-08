/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Corporate Enterprise Design System (Meridian ERP Reference)
        corporate: {
          sidebar: '#14263F',
          sidebarHover: '#203954',
          sidebarActive: '#29466A',
          workspace: '#EEF1F6',
          header: '#FFFFFF',
          card: '#FFFFFF',
          primary: '#244A70',
          primaryHover: '#1B3856',
          primaryActive: '#13283E',
          textPrimary: '#17263A',
          textSecondary: '#8491A3',
          border: '#DCE3EC',
          borderSubtle: '#E8EDF4',
        },
        brand: {
          50: '#F0F4F8',
          100: '#DCE3EC',
          200: '#B8C7D9',
          300: '#8491A3',
          400: '#4D6B8C',
          500: '#244A70',
          600: '#1B3856',
          700: '#14263F',
          800: '#0F1C2E',
          900: '#0A131F',
        },
        navy: {
          700: '#29466A',
          800: '#203954',
          900: '#14263F',
          950: '#0D1A2B',
        },
        enterprise: {
          primary: '#244A70',
          sidebar: '#14263F',
          sidebarHover: '#203954',
          sidebarActive: '#29466A',
          main: '#EEF1F6',
          surface: '#FFFFFF',
          text: '#17263A',
          subtext: '#8491A3',
          border: '#DCE3EC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(23, 38, 58, 0.05)',
        'sm': '0 1px 3px 0 rgba(23, 38, 58, 0.07), 0 1px 2px -1px rgba(23, 38, 58, 0.05)',
        'card': '0 1px 3px 0 rgba(23, 38, 58, 0.06), 0 1px 2px -1px rgba(23, 38, 58, 0.04)',
      },
      borderRadius: {
        'card': '8px',
        'input': '6px',
        'button': '6px',
        'badge': '4px',
      },
    },
  },
  plugins: [],
};
