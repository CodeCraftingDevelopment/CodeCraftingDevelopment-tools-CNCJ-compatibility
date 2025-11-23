import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'fs'

// Lire la version depuis package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Chemins relatifs pour ouvrir index.html directement sans serveur
  plugins: [
    react(),
    viteSingleFile(), // Inline tout (JS+CSS) dans un seul HTML pour compatibilité file://
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
})
