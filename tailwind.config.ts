import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        renacred: {
          blue: '#1D4ED8',      // Azul institucional oficial ("CRED")
          blueDark: '#1E3A8A',  // Azul marinho profundo
          blueHover: '#2563EB', // Hover de botões
          gray: '#5A626A',      // Cinza oficial da logo ("RENA")
          navy: '#0B1325',      // Superfície corporativa
          dark: '#080E1A',      // Fundo principal
          border: '#1E293B',    // Borda institucional
          green: '#059669',     // Verde Brasil
          gold: '#D97706',      // Amarelo Ouro Brasil
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
