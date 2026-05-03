import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.DEPLOY_BASE || '/',
  plugins: [
    react(),
    nodePolyfills({
      // ethers v6 + @noble/* may reach for Buffer / process / crypto in browser bundles.
      // Enable polyfills conservatively; we'll prune later once we confirm what is actually needed.
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
            if (id.includes('@agentdid/sdk') || id.includes('@noble') || id.includes('ethers')) {
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
