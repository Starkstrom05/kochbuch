import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: "#FBF6E9",
          100: "#F4E8C8",
          200: "#E8D6A8",
          300: "#D4B97C",
          400: "#B89A5C",
        },
        ink: {
          DEFAULT: "#2C2418",
          faded: "#5A4A30",
          light: "#7A6849",
        },
        ribbon: "#A23E2E",
        sepia: "#8B6F47",
      },
      fontFamily: {
        hand: ["var(--font-caveat)", "cursive"],
        written: ["var(--font-kalam)", "cursive"],
        serif: ["var(--font-lora)", "serif"],
      },
      backgroundImage: {
        "paper-texture": "url('/assets/textures/paper-light.svg')",
        "paper-aged": "url('/assets/textures/paper-aged.svg')",
        "paper-grid": "url('/assets/textures/grid.svg')",
        "paper-lined": "url('/assets/textures/lined.svg')",
      },
      boxShadow: {
        page: "0 6px 24px rgba(60,40,10,0.25), inset 0 0 80px rgba(120,80,30,0.08)",
        card: "0 2px 8px rgba(60,40,10,0.15)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-in",
      },
    },
  },
  plugins: [],
};

export default config;
