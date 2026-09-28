export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f7fb',
          100: '#dfeaf6',
          500: '#1d4f91',
          600: '#163f73',
          700: '#12345a',
        },
      },
      boxShadow: {
        soft: '0 12px 24px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
