import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'A&A 1942 Companion',
        short_name: 'A&A Companion',
        description: 'Axis & Allies 1942 Second Edition Manager',
        theme_color: '#2b2a26',
        background_color: '#f4ecd8',
        display: 'standalone',
        icons: [
          {
            src: '/axis.ico',
            sizes: 'any',
            type: 'image/x-icon',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
