import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// O base é setado no CI (GitHub Pages serve em /<repo>/).
// Localmente fica "/" e o app roda em http://localhost:5173/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      // GitHub Pages não tem fallback de SPA: o 404.html é servido na rota
      // profunda (ex.: /regulamento) e o roteador resolve o caminho. Como o
      // index.html aponta para os assets com caminho absoluto, a cópia vale.
      // /privacidade/ é uma página estática de verdade (public/privacidade/),
      // para que o conteúdo apareça mesmo sem JavaScript — exigência do
      // cadastro OAuth do Google.
      name: 'gh-pages-404',
      apply: 'build',
      closeBundle() {
        const dist = resolve(process.cwd(), 'dist')
        const index = resolve(dist, 'index.html')
        if (!existsSync(index)) return
        copyFileSync(index, resolve(dist, '404.html'))
      },
    },
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
  },
  server: {
    // .taste-skill guarda os perfis do Chrome das capturas e shots as imagens:
    // ficam fora do watcher (arquivos travados pelo Chrome e reload à toa).
    watch: { ignored: ['**/.taste-skill/**', '**/shots/**'] },
  },
})
