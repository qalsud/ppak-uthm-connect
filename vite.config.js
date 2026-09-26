import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// NOTE: vite-plugin-pwa is intentionally disabled until the Polish & deploy
// phase (real icons + offline strategy). A premature service worker can serve
// stale pages to browsers during development.
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