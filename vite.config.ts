import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          manifest: {
            name: 'Aevo Pro 2.0',
            short_name: 'Aevo Pro',
            description: 'A premium learning experience platform.',
            theme_color: '#0a0a0a',
            background_color: '#0a0a0a',
            display: 'standalone',
            orientation: 'portrait',
            scope: '/',
            start_url: '/',
            icons: [
              {
                src: 'https://eliabcamposteclas.com/wp-content/uploads/2026/04/ChatGPT-Image-23-de-mar.-de-2026-22_05_32.jpg',
                sizes: '192x192',
                type: 'image/jpeg'
              },
              {
                src: 'https://eliabcamposteclas.com/wp-content/uploads/2026/04/ChatGPT-Image-23-de-mar.-de-2026-22_05_32.jpg',
                sizes: '512x512',
                type: 'image/jpeg'
              },
              {
                src: 'https://eliabcamposteclas.com/wp-content/uploads/2026/04/ChatGPT-Image-23-de-mar.-de-2026-22_05_32.jpg',
                sizes: '512x512',
                type: 'image/jpeg',
                purpose: 'any maskable'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
