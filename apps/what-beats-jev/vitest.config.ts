import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Remote TLS connections can take longer than Vitest's five-second default.
    testTimeout: process.env.WHAT_BEATS_JEV_TEST_DATABASE_URL ? 30_000 : 5_000,
  },
});
