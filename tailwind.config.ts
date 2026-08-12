import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "hsl(var(--foreground))",
        canvas: "hsl(var(--background))",
        panel: "hsl(var(--card))",
        line: "hsl(var(--border))",
        gold: "hsl(var(--brand-gold))",
        teal: "hsl(var(--brand-teal))",
      },
      boxShadow: { panel: "0 18px 55px hsl(220 30% 5% / .12)" },
    },
  },
  plugins: [],
};

export default config;
