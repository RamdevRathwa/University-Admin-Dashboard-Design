import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 700,
  },
  server: {
    proxy: {
      // Dev proxy to avoid CORS/origin mismatches and "NetworkError" in the browser.
      "/api": {
        target: "http://localhost:5185",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
