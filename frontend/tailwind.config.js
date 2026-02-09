/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#eaffe6',
          100: '#d0ffc7',
          200: '#a3ff91',
          300: '#6dff54',
          400: '#39FF14',
          500: '#2de010',
          600: '#22b00d',
          700: '#1a850a',
          800: '#156b08',
          900: '#0f4f06',
        },
        navy: {
          50:  '#e8edf5',
          100: '#c5cfe6',
          200: '#9badd4',
          300: '#7189c0',
          400: '#4c68ab',
          500: '#2d4a8a',
          600: '#1d3768',
          700: '#142a52',
          800: '#0E1F3E',
          900: '#0A1F44',
        },
        accent: {
          50:  '#eaffe6',
          100: '#d0ffc7',
          200: '#a3ff91',
          300: '#6dff54',
          400: '#39FF14',
          500: '#2de010',
          600: '#22b00d',
          700: '#1a850a',
        },
        dark: {
          50:  '#f5f5f5',
          100: '#e5e5e5',
          200: '#d4d4d4',
          300: '#a3a3a3',
          400: '#737373',
          500: '#525252',
          600: '#404040',
          700: '#262626',
          800: '#171717',
          900: '#0a0a0a',
        }
      },
      boxShadow: {
        'neon': '0 0 15px rgba(57, 255, 20, 0.3)',
        'neon-sm': '0 0 8px rgba(57, 255, 20, 0.2)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 25px rgba(0, 0, 0, 0.12)',
      }
    },
  },
  plugins: [],
}
