import path from "path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: [...configDefaults.exclude, "./supabase/"],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
      lib: path.resolve(__dirname, "./lib"),
    },
  },
});
