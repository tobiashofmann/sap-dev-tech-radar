import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // UI5 Web Components (<ui5-...>) are native custom elements, not Vue components
          isCustomElement: (tag) => tag.startsWith('ui5-')
        }
      }
    })
  ],
  build: {
    // production build lands inside the site this app will eventually be
    // wired into, so it ships as static files like everything else under radar/
    outDir: '../radar/app',
    emptyOutDir: true
  }
})
