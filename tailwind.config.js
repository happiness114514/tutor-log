/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#171717',
        paper: '#f7f7f6',
        line: '#e5e5e5',
        mint: '#3f3f46',
        coral: '#b45309',
        sunshine: '#a3a3a3',
      },
      boxShadow: {
        card: '0 10px 28px rgba(23, 23, 23, 0.045)',
      },
    },
  },
  plugins: [],
};
