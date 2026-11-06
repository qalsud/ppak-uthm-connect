import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// NOTE: PWA/service-worker support is intentionally not installed yet (real
// icons + offline strategy are a later phase). A premature service worker can
// serve stale pages to browsers during development.
export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    build: {
        chunkSizeWarningLimit: 1600,
    },
});