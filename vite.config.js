import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const engine = 'http://127.0.0.1:5174';

export default defineConfig({
  // Relativa sökvägar: samma bygge fungerar på motorn (/) och på GitHub Pages (/skepnad/)
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // I utvecklingsläge: skicka motorns anrop vidare till "node serve.mjs" om den körs
    proxy: {
      '/api': engine,
      '/clips': engine,
      '/ws': { target: engine.replace('http', 'ws'), ws: true },
    },
  },
  preview: { host: '127.0.0.1', port: 4173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        output: resolve(import.meta.dirname, 'output.html'),
        remote: resolve(import.meta.dirname, 'remote.html'),
      },
    },
  },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@mediapipe/tasks-vision'] },
});
