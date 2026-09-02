import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  plugins: [react()],
  // Versiunea are o SINGURĂ sursă: package.json. Data vine din ceasul build-ului, deci nu
  // poate rămâne în urmă. Ambele se injectează la compilare — nimic de ținut sincronizat
  // manual, deci nimic care să se dezincronizeze.
  define: {
    __VERSIUNE_PKG__: JSON.stringify(pkg.version),
    __DATA_BUILD__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
