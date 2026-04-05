import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// PWA disabled temporarily to fix mobile caching issues
// Will re-enable once service worker cache is cleared on all devices

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
