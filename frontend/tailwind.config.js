/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0d1117",
        surface: {
          50: "#161b22",
          100: "#21262d",
          200: "#30363d",
          300: "#484f58",
        },
        border: {
          subtle: "#21262d",
          default: "#30363d",
          muted: "#363b42",
        },
        accent: {
          DEFAULT: "#238636",
          hover: "#2ea043",
          blue: "#388bfd",
          purple: "#8957e5",
          amber: "#d29922",
          red: "#f85149",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "'Noto Sans'",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "'SFMono-Regular'",
          "Consolas",
          "'Liberation Mono'",
          "Menlo",
          "Courier",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
}
