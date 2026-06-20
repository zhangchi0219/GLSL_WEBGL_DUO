import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps asset URLs relative so the static build works at any
// subpath (GitHub Pages /repo/, a 宝塔/BT Panel subfolder, a WordPress dir).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
