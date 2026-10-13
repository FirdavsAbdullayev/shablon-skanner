import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

/**
 *  Ikkita rejim:
 *   npm run dev        -> http://localhost:5173  (kompyuterda ishlash uchun)
 *   npm run dev:https  -> https://192.168.x.x:5173 (TELEFONDA kamera sinash uchun)
 *
 *  MUHIM: brauzerlar kamera (getUserMedia) ni faqat XAVFSIZ kontekstda beradi.
 *  Shuning uchun localhost yoki HTTPS kerak. Telefonda ochishda albatta dev:https.
 */
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    // Same-origin /api -> Express server. Shu sabab CORS muammosi bo'lmaydi.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
}));
