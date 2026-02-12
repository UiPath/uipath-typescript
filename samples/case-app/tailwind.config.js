/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'uipath-blue': '#0067df',
        'uipath-dark': '#1a365d',
      }
    },
  },
  plugins: [],
}
