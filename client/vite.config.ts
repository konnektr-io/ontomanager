import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import vueDevTools from 'vite-plugin-vue-devtools'
/* import tailwind from 'tailwindcss'
import autoprefixer from 'autoprefixer' */

// https://vitejs.dev/config/
export default defineConfig({
  /* css: {
    postcss: {
      plugins: [tailwind(), autoprefixer()],
    },
  }, */
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  assetsInclude: ['**/*.ttl'],
  server: {
    proxy: {
      '/api': {
        target: 'https://ontomanager-720202460313.europe-west1.run.app',
        secure: false,
        changeOrigin: true
      }
    }
  }
})
