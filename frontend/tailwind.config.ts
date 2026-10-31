import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#070b14",
          900: "#0b1220",
          850: "#0f1a2e",
          800: "#14223d",
          750: "#1a2c4e",
          700: "#243b66",
        },
        slate: {
          850: "#151e2e",
        },
        evidence: {
          teal: "#14b8a6",
          tealLight: "#2dd4bf",
          tealBg: "rgba(20, 184, 166, 0.12)",
          tealBorder: "rgba(20, 184, 166, 0.35)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
