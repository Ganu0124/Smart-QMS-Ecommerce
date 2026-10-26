/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563EB',
          700: '#1d4ed8',
        },
        secondary: {
          DEFAULT: '#0D9488',
          50: '#f0fdfa',
          500: '#14b8a6',
          600: '#0D9488',
          700: '#0f766e',
        },
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc5fb',
          400: '#36a6f6',
          500: '#0c87eb',
          600: '#2563EB',
          700: '#0155a3',
          800: '#054985',
          900: '#0a3d6f',
          950: '#0B1220',
        },
        appDark: '#0B1220',
        appLight: '#F5F7FA',
      },
    },
  },
  plugins: [],
}
