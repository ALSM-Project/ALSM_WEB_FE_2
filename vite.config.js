/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig(({ command, mode, isPreview }) => ({
    // A build (including --mode development/NODE_ENV overrides) can never enable HTTP Support.
    define: {
        __UC66_LOCAL_SERVE__: JSON.stringify(command === 'serve' && mode === 'development' && !isPreview),
    },
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3002,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
    },
}));
