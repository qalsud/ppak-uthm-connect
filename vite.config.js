import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The PWA lives in public/: manifest.json, sw.js and offline.html. The service
// worker is registered from app.tsx in production only, so Vite HMR never
// serves a stale app shell during development.
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