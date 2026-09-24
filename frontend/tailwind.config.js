/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
          900: '#134e4a',
        },
        primary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}
