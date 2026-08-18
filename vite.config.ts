import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'node:fs'

const packageJson = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const appVersion = packageJson.version || '1.0.0'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'logo/icon-96x96.png',
        'logo/icon-180x180.png',
        'logo/icon-192x192.png',
        'logo/icon-512x512.png',
        'logo/icon-maskable-512x512.png',
      ],
      manifest: {
        name: 'Karaoke Go',
        short_name: 'Karaoke Go',
        description: 'Host karaoke nights. Guests join with a code and run the queue.',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['entertainment', 'music'],
        icons: [
          {
            src: 'logo/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'logo/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'logo/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell only — rooms, Firebase, and YouTube stay online
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg,webp}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.includes('googleapis.com') ||
              url.hostname.includes('firebaseio.com') ||
              url.hostname.includes('firebasestorage.googleapis.com') ||
              url.hostname.includes('youtube.com') ||
              url.hostname.includes('ytimg.com') ||
              url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'karaoke-images',
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'style' ||
              request.destination === 'script' ||
              request.destination === 'worker',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'karaoke-assets',
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Proxy YouTube InnerTube API calls through Vite dev server
      // This bypasses CORS since Node.js (not the browser) makes the request
      '/api/innertube': {
        target: 'https://www.youtube.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/innertube/, '/youtubei/v1'),
        headers: {
          'Origin': 'https://www.youtube.com',
          'Referer': 'https://www.youtube.com/',
        },
      },
    },
  },
})
