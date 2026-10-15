import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: '0.0.0.0' },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes('node_modules/three')
            ? 'three'
            : id.includes('@phosphor-icons')
              ? 'icons'
              : undefined,
      },
    },
  },
});
