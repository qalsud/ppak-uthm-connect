import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico'],
            manifest: {
                name: 'PPAK UTHM Connect System',
                short_name: 'PPAK UTHM',
                description: 'Platform pengurusan Pusat Pendidikan Awal Kanak-Kanak UTHM',
                theme_color: '#2d6abb',
                background_color: '#f8f9fa',
                display: 'standalone',
                start_url: '/',
                lang: 'ms',
                icons: [
                    {
                        src: '/pwa-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-maskable-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                navigateFallback: '/',
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
    build: {
        chunkSizeWarningLimit: 1600,
    },
});