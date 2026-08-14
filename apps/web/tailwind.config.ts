import type { Config } from "tailwindcss";

export default {
  content: [
    "./app.vue",
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./composables/**/*.{js,ts}",
  ],
  theme: {
    screens: {
      tablet: "768px",
      desktop: "1200px",
    },
    extend: {
      colors: {
        ink: {
          950: "#070708",
          900: "#0c0c0e",
          800: "#121216",
          700: "#1a1a20",
          600: "#24242c",
        },
        gold: {
          300: "#e4c56a",
          400: "#d4af37",
          500: "#c9a227",
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        display: ["Cormorant Garamond", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
