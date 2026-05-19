import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/homedesigner/',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/three/')) return 'three'
          if (id.includes('@react-three/')) return 'r3f'
          if (id.includes('node_modules/konva') || id.includes('node_modules/react-konva')) return 'konva'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
