/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#090b10',
          panel: '#11151f',
          card: '#161b28',
          border: '#232b3e',
          accent: '#00f0ff',
          purple: '#7c3aed',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 240, 255, 0.25)',
        'neon-purple': '0 0 20px rgba(124, 58, 237, 0.25)',
      }
    },
  },
  plugins: [],
};
