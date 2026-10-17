/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tealbg: '#B7D2D0',
        hero: {
          DEFAULT: '#397783',
          dark: '#2B5E68',
          light: '#4B8E9B',
        },
        brand: {
          50: '#f0f9f8',
          100: '#daf0ee',
          200: '#b7d2d0',
          300: '#86b8b7',
          400: '#569b9c',
          500: '#397783',
          600: '#2c626d',
          700: '#264f59',
          800: '#234149',
          900: '#20373e',
          950: '#102227',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
