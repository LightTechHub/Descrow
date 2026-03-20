/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1e3a5f',
        'primary-dark': '#2d4a7c',
        accent: '#10b981',
      },
    },
  },
  plugins: [],
};
