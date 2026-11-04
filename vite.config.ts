import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/homeDesigner/',
  plugins: [react(), tailwindcss()],
  build: {
    // The 3D view is a dynamic import (see App.tsx), so three.js and
    // react-three-fiber land in their own lazily-loaded chunk; shared deps
    // (react, zustand) stay in the entry. Hand-written manualChunks used to
    // drag those shared deps into the 3D chunk and force it to load upfront.
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
