import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // Each database test file boots PGlite and runs every migration; a busy machine needs more than the 10 s default.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
