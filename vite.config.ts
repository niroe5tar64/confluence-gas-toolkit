import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "~/clients": path.resolve(import.meta.dirname, "./src/clients"),
      "~/config": path.resolve(import.meta.dirname, "./src/config"),
      "~/services": path.resolve(import.meta.dirname, "./src/services"),
      "~/types": path.resolve(import.meta.dirname, "./src/types"),
      "~/use-case": path.resolve(import.meta.dirname, "./src/use-case"),
      "~/utils": path.resolve(import.meta.dirname, "./src/utils"),
    },
  },
});
