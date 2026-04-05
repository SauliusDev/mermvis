import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vscode from '@tomjs/vite-plugin-vscode'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    vscode({
      extension: {
        entry: 'src/extension/extension.ts',
      },
    }),
  ],
  build: {
    outDir: 'out',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/webview'),
    },
  },
})
