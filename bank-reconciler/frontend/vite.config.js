import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standard Vite + React setup. VITE_API_URL is read at build/runtime
// from a .env file so the same code can point at localhost during
// development and your real AWS API URL in production.
export default defineConfig({
  plugins: [react()],
});
