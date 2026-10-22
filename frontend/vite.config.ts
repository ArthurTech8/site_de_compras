/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      // Em desenvolvimento o Vite repassa /api para o backend, então não há CORS no navegador.
      proxy: {
        '/api': { target: env.VITE_API_PROXY ?? 'http://localhost:5285', changeOrigin: true },
      },
    },
    test: {
      environment: 'jsdom',
    },
  }
})
