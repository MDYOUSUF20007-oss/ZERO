/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', '"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Inter"', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        zero: {
          bg: '#0A0A0A',
          card: '#121212',
          cardBorder: '#262626',
          textMuted: '#737373',
          accent: '#EDEDED',
          border: '#333333',
          amber: '#F59E0B',
          red: '#EF4444',
          emerald: '#10B981',
          cyan: '#06B6D4'
        }
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px rgba(255, 255, 255, 0.1)',
        'brutal-white': '4px 4px 0px 0px #EDEDED',
        'brutal-red': '4px 4px 0px 0px #EF4444',
        'glow-white': '0 0 25px -5px rgba(255, 255, 255, 0.25)',
      }
    },
  },
  plugins: [],
}
