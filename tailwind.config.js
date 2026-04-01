/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf6eb',
          100: '#f9e9cc',
          200: '#f2d09a',
          300: '#e9b060',
          400: '#e59a1d',
          500: '#c9943e',
          600: '#a87a32',
          700: '#8b673f',
          800: '#5d3b11',
          900: '#2b1a10',
          950: '#050403',
        },
        surface: {
          50: '#1c120a',
          100: '#110c09',
          200: '#090605',
          300: '#0a0806',
        },
        text: {
          primary: '#ece7e2',
          secondary: '#9e8468',
          muted: '#84705d',
          dim: '#5f4c3b',
        },
        accent: {
          green: '#1fc164',
          red: '#c45a3a',
        },
      },
      fontFamily: {
        mono: ["'JetBrains_Mono'", 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    }
  },
  plugins: []
}
