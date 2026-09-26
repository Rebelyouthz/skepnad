import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        output: resolve(import.meta.dirname, 'output.html'),
      },
    },
  },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@mediapipe/tasks-vision'] },
});
