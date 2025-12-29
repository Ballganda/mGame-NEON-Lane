import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Updated base to match the repository name for GitHub project pages
  base: '/mGame-NEON-Lane/', 
  server: {
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser'
  }
});