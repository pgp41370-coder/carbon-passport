import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // PDF.js, Tesseract.js and SheetJS are large by nature and are lazy-loaded
    // per document type; this only quiets the size warning for those chunks.
    chunkSizeWarningLimit: 1500,
  },
})
