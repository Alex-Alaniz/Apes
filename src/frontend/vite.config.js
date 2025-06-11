import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      },
      onwarn(warning, warn) {
        // Suppress certain warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.source?.includes('globalThis-config')) return;
        warn(warning);
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    'import.meta.env.VITE_API_URL': '"http://localhost:5001"'
  },
  resolve: {
    alias: {
      '@': '/src',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      assert: 'assert',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      url: 'url',
      buffer: 'buffer'
    }
  },
  optimizeDeps: {
    include: [
      'buffer',
      '@coral-xyz/anchor',
      '@solana/wallet-adapter-react',
      '@solana/wallet-adapter-react-ui',
      '@solana/wallet-adapter-phantom',
      '@solana/wallet-adapter-solflare',
      '@solana/web3.js',
      '@solana/spl-token'
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  }
});
