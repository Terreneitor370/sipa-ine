/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        riesgo: {
          "muy-alto": "#B2182B",
          alto: "#EF8A62",
          medio: "#FDDBC7",
          bajo: "#67A9CF",
        },
        acento: {
          DEFAULT: "#0F4C81",
          claro: "#1B6CA8",
          tenue: "#EAF1F7",
        },
        panel: "#1F2937",
        fondo: "#FAFAFA",
        ink: "#111827",
        "ink-2": "#6B7280",
        linea: "#D1D5DB",
        "linea-2": "#E5E7EB",
        tabla: "#F3F4F6",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        base: ["13px", "18px"],
        label: ["11px", "14px"],
      },
    },
  },
  plugins: [],
};
