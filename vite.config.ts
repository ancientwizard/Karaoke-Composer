import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacy({targets: ['defaults', 'not IE 11'],}),
  ],
  resolve: {alias: {'@': resolve(__dirname, 'src'),},},
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
})
