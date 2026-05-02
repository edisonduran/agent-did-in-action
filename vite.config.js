import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
// https://vitejs.dev/config/
export default defineConfig({
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
    server: {
        port: 5173
    }
});
