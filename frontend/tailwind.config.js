/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark mode theme colors
        'dark-bg': '#121212',
        'dark-surface': '#1E1E1E',
        // Neon accent colors for your UI
        'neon-blue': '#00F0FF',
        'neon-green': '#39FF14',
        'neon-teal': '#01FFC3',
      },
    },
  },
  plugins: [],
}