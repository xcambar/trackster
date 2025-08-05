import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    // setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
      lib: path.resolve(__dirname, "./lib"),
    },
  },
});
