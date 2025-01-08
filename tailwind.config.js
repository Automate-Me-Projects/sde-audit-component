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
    },
  },
  plugins: [
    forms({
      strategy: 'class',
    }),
  ],
}
