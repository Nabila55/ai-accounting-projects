/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Custom token system — white + purple, per the design brief.
        // Using named tokens (not raw hex in components) makes it easy
        // to re-theme later by editing only this file.
        brand: {
          DEFAULT: "#6D28D9",   // primary purple — buttons, active states
          dark: "#5B21B6",      // hover/pressed state
          light: "#8B5CF6",     // secondary accents, progress bar
        },
        panel: "#F5F3FF",       // soft lavender panel background
        ink: "#1E1B2E",         // near-black, purple-tinted text
        muted: "#6B7280",       // secondary/help text
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
