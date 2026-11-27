#!/usr/bin/env node
/*
  Grava o DPI físico num PNG (chunk pHYs), para o arquivo imprimir no tamanho
  certo em programas que respeitam o DPI (Word, PowerPoint, Canva…).

  O `shoot-app.mjs` captura em pixels exatos (ex.: 768×768), mas o PNG sai sem
  densidade física — este script carimba "300 dpi" (ou o valor pedido) para que
  768 px sejam entendidos como 6,5 cm.

  Uso: node scripts/png-dpi.mjs <arquivo.png> <dpi>
*/

import fs from 'node:fs'

const [file, dpiArg] = process.argv.slice(2)
if (!file || !dpiArg) {
  console.error('uso: node scripts/png-dpi.mjs <arquivo.png> <dpi>')
  process.exit(1)
}
const dpi = Number(dpiArg)
if (!Number.isFinite(dpi) || dpi <= 0) {
  console.error('dpi inválido:', dpiArg)
  process.exit(1)
}

const buf = fs.readFileSync(file)
const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
if (!buf.subarray(0, 8).equals(SIG)) {
  console.error('não é um PNG:', file)
  process.exit(1)
}

// CRC32 (PNG)
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return (b) => {
    let c = 0xffffffff
    for (const x of b) c = t[(c ^ x) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
})()

const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(CRC(body))
  return Buffer.concat([len, body, crc])
}

const ppu = Math.round(dpi / 0.0254) // pixels por metro
const phys = Buffer.alloc(9)
phys.writeUInt32BE(ppu, 0)
phys.writeUInt32BE(ppu, 4)
phys[8] = 1 // unidade: metro

// remove pHYs antigos e insere o novo logo depois do IHDR
const parts = []
let off = 8
let inserted = false
while (off < buf.length) {
  const len = buf.readUInt32BE(off)
  const type = buf.toString('ascii', off + 4, off + 8)
  const end = off + 12 + len
  if (type !== 'pHYs') parts.push(buf.subarray(off, end))
  if (type === 'IHDR' && !inserted) {
    parts.push(chunk('pHYs', phys))
    inserted = true
  }
  if (type === 'IEND') break
  off = end
}
fs.writeFileSync(file, Buffer.concat([buf.subarray(0, 8), ...parts]))
console.log(`${file}: ${dpi} dpi`)
