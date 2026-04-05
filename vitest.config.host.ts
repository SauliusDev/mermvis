import { defineConfig } from 'vitest/config'

// Vitest configuration for extension host unit tests (no VS Code API, no DOM)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/extension/**/*.test.ts'],
  },
})
