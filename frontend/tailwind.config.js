/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Clash Display"', 'sans-serif'],
        heading: ['Raleway', 'sans-serif'],
        sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#ecfdf3',
          100: '#d1fae1',
          200: '#a6f4c5',
          300: '#72f6ae',
          400: '#4ae091',
          500: '#22c970',
          600: '#15a35a',
          700: '#108249',
          800: '#0f673b',
          900: '#0d5533',
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 10px 30px rgba(0,0,0,0.08)',
        'brand': '0 4px 20px rgba(114,246,174,0.25)',
        'brand-lg': '0 8px 40px rgba(114,246,174,0.3)',
      },
    },
  },
  plugins: [],
}
