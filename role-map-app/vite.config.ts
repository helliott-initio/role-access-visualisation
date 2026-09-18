/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/role-access-visualisation/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
