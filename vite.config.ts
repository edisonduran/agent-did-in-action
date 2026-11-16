import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.DEPLOY_BASE || '/',
  resolve: {
    alias: [
      // @agentdid/sdk imports these lazily for file stores and its SSRF-safe fetcher;
      // the demo never reaches them, see src/shims/node-unavailable.ts
      {
        find: /^(node:)?(fs\/promises|dns|http|https)$/,
        replacement: fileURLToPath(new URL('./src/shims/node-unavailable.ts', import.meta.url)),
      },
    ],
  },
  plugins: [
    react(),
    nodePolyfills({
      // Left to the aliases above instead
      exclude: ['fs', 'dns', 'http', 'https'],
      // @agentdid/sdk and its dependencies may reach for Buffer / process / path in browser bundles.
      globals: {
        Buffer: true,
        global: true,
        process: true
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pixi.js')) return 'pixi';
            if (id.includes('@agentdid/sdk') || id.includes('@noble')) {
              return 'sdk';
            }
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          }
          // Each demo gets its own chunk so the registry is the only thing
          // the gallery pays for up front.
          const demoMatch = id.match(/[\\/]src[\\/]demos[\\/]([^\\/]+)[\\/]/);
          if (demoMatch && demoMatch[1] !== '_registry.ts' && !demoMatch[1].startsWith('_')) {
            return `demo-${demoMatch[1]}`;
          }
          return undefined;
        }
      }
    }
  },
  server: {
    port: 5173
  }
});
