/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Playwright runs a second copy on other ports, so both can be set from the environment.
const apiPort = process.env.ACCOUNTABLE_API_PORT ?? '8000'
const webPort = Number(process.env.ACCOUNTABLE_WEB_PORT ?? 5173)

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${apiPort}` },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
