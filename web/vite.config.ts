/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(__dirname, "../data");

export default defineConfig({
  plugins: [
    react(),
    {
      name: "serve-data-files",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && /^\/(upegs|svgs|stats|meta)\.json$/.test(req.url)) {
            const filePath = path.join(dataDir, req.url);
            if (fs.existsSync(filePath)) {
              res.setHeader("content-type", "application/json");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          next();
        });
      },
    },
  ],
  base: "./",
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
