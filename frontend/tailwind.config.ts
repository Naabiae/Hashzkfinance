import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        tertiary: "var(--tertiary)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-strong": "var(--surface-strong)",
        border: "var(--border)",
        muted: "var(--muted)",
      },
      fontFamily: {
        sans: ["var(--font-sans-family)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        sm: "0 2px 8px -2px rgba(37, 47, 44, 0.05)",
        md: "0 4px 16px -4px rgba(37, 47, 44, 0.08)",
        lg: "0 8px 24px -6px rgba(37, 47, 44, 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;