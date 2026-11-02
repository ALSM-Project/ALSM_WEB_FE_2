import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
  plugins: [react()],
  define: { __UC66_LOCAL_SERVE__: false },
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  test: {
    include: ['test/integration/uc66-05a.http.test.tsx'],
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://127.0.0.1:3017/test/integration/uc66-05a.html' } },
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30000,
  },
});
