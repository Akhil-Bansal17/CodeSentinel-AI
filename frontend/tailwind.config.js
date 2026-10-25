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
        background: "var(--color-bg-base)",
        surface: {
          base: "var(--color-surface-base)",
          elevated: "var(--color-surface-elevated)",
          card: "var(--color-surface-card)",
          "card-hover": "var(--color-surface-card-hover)",
          subtle: "var(--color-surface-subtle)",
          hover: "var(--color-surface-hover)",
          active: "var(--color-surface-active)",
          overlay: "var(--color-surface-overlay)",
          input: "var(--color-surface-input)",
          // Backward-compatibility keys for legacy phase components
          50: "#161b22",
          100: "#21262d",
          200: "#30363d",
          300: "#484f58",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          disabled: "var(--color-text-disabled)",
          inverse: "var(--color-text-inverse)",
        },
        border: {
          default: "var(--color-border-default)",
          subtle: "var(--color-border-subtle)",
          strong: "var(--color-border-strong)",
          interactive: "var(--color-border-interactive)",
          // Backward-compatibility keys
          muted: "#363b42",
        },
        accent: {
          DEFAULT: "var(--color-accent-primary)",
          hover: "var(--color-accent-hover)",
          active: "var(--color-accent-active)",
          subtle: "var(--color-accent-subtle)",
          border: "var(--color-accent-border)",
          foreground: "var(--color-accent-foreground)",
          // Legacy color aliases
          blue: "#388bfd",
          purple: "#8957e5",
          amber: "#d29922",
          red: "#f85149",
        },
        status: {
          success: {
            DEFAULT: "var(--color-success-base)",
            bg: "var(--color-success-bg)",
            border: "var(--color-success-border)",
            text: "var(--color-success-text)",
          },
          warning: {
            DEFAULT: "var(--color-warning-base)",
            bg: "var(--color-warning-bg)",
            border: "var(--color-warning-border)",
            text: "var(--color-warning-text)",
          },
          danger: {
            DEFAULT: "var(--color-danger-base)",
            bg: "var(--color-danger-bg)",
            border: "var(--color-danger-border)",
            text: "var(--color-danger-text)",
          },
          info: {
            DEFAULT: "var(--color-info-base)",
            bg: "var(--color-info-bg)",
            border: "var(--color-info-border)",
            text: "var(--color-info-text)",
          },
        },
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
        modal: "var(--shadow-modal)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Noto Sans'",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "'JetBrains Mono'",
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
