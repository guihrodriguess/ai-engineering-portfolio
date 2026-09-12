import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globalSetup: './tests/globalSetup.ts',
    testTimeout: 15000,
    fileParallelism: false, // testes de integração compartilham o mesmo Postgres
  },
});
