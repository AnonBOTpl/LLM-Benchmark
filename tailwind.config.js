/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#080b14",
          900: "#0d1220",
          850: "#121828",
          800: "#161d30",
          700: "#1e273d",
          600: "#2a3550",
          500: "#3b4a6b",
        },
        accent: {
          400: "#38e1f0",
          500: "#22d3ee",
          600: "#0fb6d4",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Cascadia Mono", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
