import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f8f6",
          100: "#e1ece5",
          200: "#bdd4c4",
          300: "#8ab09a",
          400: "#5c8f71",
          500: "#3a7257",
          600: "#2e5b45",
          700: "#264a3a",
          800: "#1f3d30",
          900: "#1a3228"
        },
        accent: {
          sand: "#f8f1e2",
          clay: "#b9673a",
          ink: "#1c2a24"
        }
      },
      boxShadow: {
        panel: "0 20px 40px -24px rgba(30, 70, 50, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
