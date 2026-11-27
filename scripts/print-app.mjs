#!/usr/bin/env node
/*
  Gera um PDF de uma página do app pelo Chrome headless, em tamanho real:
  o papel e as dimensões físicas vêm do CSS da página (@page + unidades mm),
  então o PDF imprime em escala 100% (ex.: a folha das medalhas + troféu).

  Uso:
    node scripts/print-app.mjs --url /artes/folha-impressao.html --out artes/export/folha.pdf
  Opções: --url <caminho> --out <arquivo.pdf> --base <url> --settle <ms>
          --profile <dir>
*/

import fs from 'node:fs'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const opt = (k, d) => {
  const i = args.indexOf('--' + k)
  return i < 0 ? d : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true
}

const urlPath = String(opt('url', '/artes/folha-impressao.html'))
const out = String(opt('out', 'artes/export/folha-impressao.pdf'))
const base = String(opt('base', 'http://localhost:5180')).replace(/\/$/, '')
const settle = +opt('settle', 900)
const profile = path.resolve(String(opt('profile', '.taste-skill/chrome-print')))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ----------------------------------------------------------------- chrome */

function findChrome() {
  const local = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe') : null
  const c = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    local,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ]
  const f = c.find((p) => p && fs.existsSync(p))
  if (!f) throw new Error('no Chrome found (set CHROME_PATH)')
  return f
}

fs.mkdirSync(profile, { recursive: true })
const portFile = path.join(profile, 'DevToolsActivePort')
try {
  fs.rmSync(portFile)
} catch {
  /* none */
}
const child = spawn(
  findChrome(),
  [
    '--headless=new',
    `--user-data-dir=${profile}`,
    '--remote-debugging-port=0',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--mute-audio',
    '--disable-gpu',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--window-size=1280,900',
    'about:blank',
  ],
  { stdio: 'ignore', windowsHide: true },
)
const kill = () => {
  if (child.exitCode != null) return
  try {
    execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  } catch {
    try {
      child.kill()
    } catch {
      /* gone */
    }
  }
}
const guard = setTimeout(() => {
  console.error('print-app: timeout')
  kill()
  process.exit(2)
}, 120000)

try {
  let port = null
  for (let i = 0; i < 150 && !port; i += 1) {
    await sleep(100)
    try {
      port = parseInt(fs.readFileSync(portFile, 'utf8'), 10) || null
    } catch {
      /* not yet */
    }
  }
  if (!port) throw new Error('Chrome did not start')

  const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
  const ws = new WebSocket(ver.webSocketDebuggerUrl)
  await new Promise((r, j) => {
    ws.addEventListener('open', r, { once: true })
    ws.addEventListener('error', j, { once: true })
  })

  let id = 0
  const pend = new Map()
  const subs = []
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pend.has(m.id)) {
      pend.get(m.id)(m)
      pend.delete(m.id)
    } else subs.forEach((f) => f(m))
  })
  const send = (method, params = {}, sessionId) =>
    new Promise((r) => {
      const i = ++id
      pend.set(i, r)
      ws.send(JSON.stringify({ id: i, method, params, sessionId }))
    })

  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' })
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true })
  const S = async (m, p) => {
    const r = await send(m, p, sessionId)
    if (r.error) throw new Error(`${m}: ${r.error.message}`)
    return r.result
  }
  const ev = async (x) => {
    const r = await S('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) {
      const d = r.exceptionDetails
      throw new Error('eval: ' + (d.exception?.description || d.text).split('\n')[0])
    }
    return r.result.value
  }

  await S('Page.enable')
  await S('Runtime.enable')

  const nextLoad = () =>
    new Promise((r) => {
      const f = (m) => {
        if (m.method === 'Page.loadEventFired') {
          subs.splice(subs.indexOf(f), 1)
          r()
        }
      }
      subs.push(f)
    })

  const l = nextLoad()
  await S('Page.navigate', { url: `${base}${urlPath}` })
  await Promise.race([l, sleep(20000)])
  await ev(`new Promise((r) => { const t = performance.now(); (function w() { if (document.readyState === 'complete' && performance.now() - t > 400) r(1); else setTimeout(w, 50) })() })`)
  await ev('document.fonts ? document.fonts.ready.then(() => 1) : 1')
  await ev(`new Promise((r) => { const pending = [...document.images].filter((i) => !i.complete); if (!pending.length) return r(1); let n = pending.length; pending.forEach((i) => { const done = () => { n -= 1; if (!n) r(1) }; i.addEventListener('load', done, { once: true }); i.addEventListener('error', done, { once: true }) }); setTimeout(() => r(1), 5000) })`)
  await sleep(settle)

  const { data } = await S('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: true,
    paperWidth: 8.27,
    paperHeight: 11.69,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    scale: 1,
  })
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
  fs.writeFileSync(path.resolve(out), Buffer.from(data, 'base64'))
  console.log(`saved ${out} (${(Buffer.from(data, 'base64').length / 1024).toFixed(0)} KB, rota ${urlPath})`)
} catch (e) {
  console.error('print-app:', e.message)
  process.exitCode = 1
} finally {
  clearTimeout(guard)
  await sleep(300)
  kill()
}
