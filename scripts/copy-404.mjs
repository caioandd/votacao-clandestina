#!/usr/bin/env node
/*
  GitHub Pages não conhece as rotas do React Router: um link direto como
  /votacao-clandestina/copa responde 404. Como a Pages serve o 404.html para
  qualquer caminho desconhecido, uma cópia do index.html resolve o deep link —
  o app sobe no caminho pedido e o router encontra a rota.
*/
import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
const index = path.join(dist, 'index.html')
const fallback = path.join(dist, '404.html')

if (!fs.existsSync(index)) {
  console.error('copy-404: dist/index.html não existe — rode o vite build antes.')
  process.exit(1)
}

fs.copyFileSync(index, fallback)
console.log('copy-404: dist/404.html criado (fallback para links diretos do GitHub Pages).')
