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
        /** Identidad INE: rosa mexicano, vino, azul marino (manual institucional) */
        acento: {
          DEFAULT: "#d5007f",
          claro: "#e8339a",
          tenue: "#fde8f4",
        },
        ine: {
          rosa: "#d5007f",
          vino: "#950054",
          marino: "#1a2a4a",
          gris: "#b2b2b2",
        },
        panel: "#950054",
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
