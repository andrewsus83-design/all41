import { defineConfig } from "vitest/config";
import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
  test: { include: ["tests/**/*.test.ts"], testTimeout: 60_000, hookTimeout: 60_000, fileParallelism: false },
});
