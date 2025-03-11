import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "~/clients": path.resolve(__dirname, "./src/clients"),
      "~/services": path.resolve(__dirname, "./src/services"),
      "~/types": path.resolve(__dirname, "./src/types"),
      "~/use-case": path.resolve(__dirname, "./src/use-case"),
      "~/utils": path.resolve(__dirname, "./src/utils"),
    },
  },
});
