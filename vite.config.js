import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // `npm test`: components rendered in jsdom against a fake API (test/server.js).
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{js,jsx}'],
    setupFiles: ['test/setup.js'],
    restoreMocks: true,
    unstubGlobals: true,
  },
})
