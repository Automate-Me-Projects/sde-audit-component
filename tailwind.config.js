import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sde-green': 'rgb(0, 106, 60)',
        'sde-light-green': '#e8fbd3',
        'sde-text-green': 'rgb(146, 208, 80)',
        'sde-orange': 'rgb(200, 100, 0)',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      },
      keyframes: {
        'spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [
    forms({
      strategy: 'class',
    }),
  ],
}
