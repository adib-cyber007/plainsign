import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/plainsign/",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { demo: "index.html", review: "review.html" },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
