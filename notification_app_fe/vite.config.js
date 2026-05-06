import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/evaluation-service': {
        target: 'http://20.207.122.201',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ['logging-middleware']
  },
  build: {
    commonjsOptions: {
      include: [/logging-middleware/, /node_modules/]
    }
  }
});
