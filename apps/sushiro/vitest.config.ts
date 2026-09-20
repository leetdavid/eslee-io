import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

if (process.env.CI && !process.env.SUSHIRO_TEST_DATABASE_URL) {
  throw new Error("CI requires SUSHIRO_TEST_DATABASE_URL; database tests must not be skipped");
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
