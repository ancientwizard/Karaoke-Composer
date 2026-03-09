import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/Karaoke-Composer/',
  plugins: [
    vue(),
    legacy({targets: ['defaults', 'not IE 11'],}),
  ],
  resolve: {alias: {'@': resolve(__dirname, 'src'),},},
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    open: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
}))
