import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/macrocoder-site/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        connect: resolve(__dirname, 'connect/index.html'),
        chat: resolve(__dirname, 'chat/index.html')
      }
    }
  }
})
