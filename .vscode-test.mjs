import { defineConfig } from '@vscode/test-cli'

export default defineConfig({
  files: 'src/test/suite/**/*.test.ts',
  mocha: {
    ui: 'tdd',
    timeout: 20000,
  },
})
