/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chat-bg': '#343541',
        'chat-sidebar': '#202123',
        'chat-input': '#40414f',
        'chat-user': '#343541',
        'chat-assistant': '#444654',
        'chat-border': '#4d4d4f',
        'chat-hover': '#2a2b32',
        'accent': '#10a37f',
        'accent-hover': '#1a7f64',
      }
    },
  },
  plugins: [],
}
