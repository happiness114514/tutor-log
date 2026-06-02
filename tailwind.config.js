/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2933',
        paper: '#f7f8fa',
        line: '#e4e7ec',
        mint: '#4f9f8f',
        coral: '#f08a7d',
        sunshine: '#f4c95d',
      },
      boxShadow: {
        card: '0 8px 24px rgba(31, 41, 51, 0.06)',
      },
    },
  },
  plugins: [],
};
