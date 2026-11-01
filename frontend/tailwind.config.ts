import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f5f2",
        ink: "#182336",
        muted: "#f0f2f5",
        line: "#dfe3e8",
        accent: "#c64025",
        cobalt: "#2855d9",
        navy: {
          950: "#070b14",
          900: "#0b1220",
          850: "#0f1a2e",
          800: "#14223d",
          750: "#1a2c4e",
          700: "#243b66",
        },
        slate: {
          500: "#5d6c81",
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
          "var(--font-body)",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        display: ["var(--font-display)", "sans-serif"],
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
