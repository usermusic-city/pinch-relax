import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 1024 * 512,
    chunkSizeWarningLimit: 2048
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
