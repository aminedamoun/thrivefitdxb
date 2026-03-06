// FILE: tailwind.config.js  (drop-in)
// Reason: make sure Tailwind generates font utilities and scans your files.
export default {
  content: [
    "./index.html",
    "./pages/**/*.html",
    "./public/**/*.{html,js}",
    "./css/**/*.css"
  ],
  theme: {
    extend: {
      fontFamily: {
        cta: ['Montserrat', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Montserrat', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        headline: ['Bebas Neue', 'Oswald', 'Montserrat', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#D6B56F',
          dark: '#C4A55F',
          light: '#E0C89F',
        },
        secondary: '#C4A55F',
        gray: '#CCCCCC',
        black: '#0A0A0A',
        white: '#FFFFFF',
      },
    },
  },
  plugins: [],
};
