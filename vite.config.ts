import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Crypto Terminal',
        short_name: 'CryptoApp',
        description: 'Professional cryptocurrency trading terminal with portfolio tracking, PnL analysis, and market sentiment',
        theme_color: '#1E293B',
        background_color: '#1E293B',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/?v=2.0',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.bybit\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'bybit-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutes
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\.alternative\.me\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fear-greed-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 30 // 30 minutes
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\.coingecko\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'coingecko-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 10 // 10 minutes
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
