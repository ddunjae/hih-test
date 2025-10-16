import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    fs: {
      strict: false
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'web-ifc': ['web-ifc', 'web-ifc-three']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['web-ifc']
  },
  resolve: {
    alias: {
      'web-ifc': path.resolve(__dirname, 'node_modules/web-ifc')
    }
  },
  assetsInclude: ['**/*.wasm']
});
