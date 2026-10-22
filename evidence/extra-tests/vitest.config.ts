
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: [path.resolve(__dirname, './**/*.test.ts')],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      supertest: path.resolve(__dirname, '../../backend/node_modules/supertest'),
    },
  },
});
