import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// WASM 파일 복사 플러그인
function copyWasmPlugin() {
  return {
    name: 'copy-wasm',
    writeBundle() {
      const wasmFiles = [
        'web-ifc.wasm',
        'web-ifc-mt.wasm',
        'web-ifc-node.wasm'
      ];

      const distDir = path.resolve(__dirname, 'dist');
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }

      wasmFiles.forEach(file => {
        const src = path.resolve(__dirname, 'public', file);
        const dest = path.resolve(distDir, file);

        if (existsSync(src)) {
          copyFileSync(src, dest);
          console.log(`✓ Copied ${file} to dist/`);
        }
      });
    }
  };
}

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
  plugins: [copyWasmPlugin()],
  optimizeDeps: {
    exclude: ['web-ifc']
  },
  resolve: {
    alias: {
      'web-ifc': path.resolve(__dirname, 'node_modules/web-ifc')
    }
  },
  assetsInclude: ['**/*.wasm'],
  publicDir: 'public'
});
