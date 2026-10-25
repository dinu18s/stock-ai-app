import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0e14",
        surface: "#151922",
        surfaceHover: "#1f2430",
        border: "#232936",
        bullish: "#00c076",
        bearish: "#ff4d4d",
      },
    },
  },
  plugins: [],
};
export default config;