#!/usr/bin/env node
/*
  Captura telas internas do app em Chrome headless, para conferir o visual
  em 390px (celular) e 1440px (desktop) sem depender do navegador do app.

  O app roda em MODO DEMONSTRAÇÃO (localStorage). Este script abre a página,
  semeia o estado pelo próprio adaptador demo (importado via Vite), recarrega
  na rota pedida e tira a foto.

  Uso:
    node scripts/shoot-app.mjs --route votar   --w 390
    node scripts/shoot-app.mjs --route times   --w 390
    node scripts/shoot-app.mjs --route ranking --w 1440 --out shots/app/1440-ranking.png

  Rotas: landing, landing-encerrada, identificar, identificar-salvo,
          identificar-encerrada, votar, revisar, enviado, encerrada, regulamento,
          privacidade, admin, admin-porta, ranking, times, cedulas, ajustes,
          copa, copa-publica, copa-cheia, copa-publica-cheia, copa-times-salvo.
  Opções: --w <largura> --h <altura> --out <arquivo.png> --base <url>
          --act "<js>" (roda antes da foto) --settle <ms> --profile <dir>
*/

import fs from 'node:fs'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const opt = (k, d) => {
  const i = args.indexOf('--' + k)
  return i < 0 ? d : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true
}

const HEIGHTS = { 360: 780, 390: 844, 414: 896, 430: 932, 768: 1024, 820: 1180, 1024: 768, 1280: 800, 1440: 900 }
const route = String(opt('route', 'votar'))
const W = +opt('w', 390)
const VH = +opt('h', HEIGHTS[W] || 900)
const DSF = +opt('dsf', W < 600 ? 2 : 1)
const clipSel = opt('clip') && opt('clip') !== true ? String(opt('clip')) : null
const out = String(opt('out', `shots/app/${W}-${route}${clipSel ? '-clip' : ''}.png`))
const base = String(opt('base', 'http://localhost:5180')).replace(/\/$/, '')
const settle = +opt('settle', 900)
const extraAct = opt('act') && opt('act') !== true ? String(opt('act')) : null
const profile = path.resolve(String(opt('profile', '.taste-skill/chrome-app')))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ seeds */

// O votante do QA é um "aparelho" (cookie) — igual ao fluxo real.
const VOTER_ID = 'qa-aparelho-0001'
const SET_COOKIE = `document.cookie = 'cd_voter_v1=' + encodeURIComponent(JSON.stringify({ id: '${VOTER_ID}', name: 'Caio Andrade' })) + '; Max-Age=31536000; Path=/'`

const BOOT = `
(async () => {
  const { createDemoAdapter } = await import('/src/lib/data/demo.ts')
  const adapter = createDemoAdapter()
  await adapter.resetDemo()
  document.cookie = 'cd_voter_v1=; Max-Age=0; Path=/'
  __RESULT__ = { ok: true }
})().catch((e) => { __RESULT__ = { error: String(e) } })
`

const SEED_DRAFT = BOOT.replace('__RESULT__ = { ok: true }', `
  ${SET_COOKIE}
  const players = await adapter.listPlayers()
  const scores = {}
  players.forEach((p, i) => { if (i < 6) scores[p.id] = [5, 4, 3, null, 5, 2][i] })
  localStorage.setItem('cd_draft_v1_${VOTER_ID}', JSON.stringify({ fullName: 'Caio Andrade', scores, updatedAt: Date.now() }))
  __RESULT__ = { players: players.length, answered: Object.keys(scores).length }`)

const SEED_SUBMITTED = BOOT.replace('__RESULT__ = { ok: true }', `
  ${SET_COOKIE}
  const players = await adapter.listPlayers()
  const scores = {}
  players.forEach((p, i) => { scores[p.id] = i % 7 === 3 ? null : 2 + ((i * 3) % 4) })
  const res = await adapter.submitBallot('${VOTER_ID}', 'Caio Andrade', scores)
  __RESULT__ = { revision: res.revision }`)

const SEED_BALLOTS = BOOT.replace('__RESULT__ = { ok: true }', `
  await adapter.signIn()
  await adapter.seedDemoBallots(24)
  __RESULT__ = { ballots: (await adapter.listBallots()).length }`)

// Copa: logado como organização, chave vazia (placeholders em tudo).
const SEED_COPA = BOOT.replace('__RESULT__ = { ok: true }', `
  await adapter.signIn()
  __RESULT__ = { ok: true }`)

// Copa cheia: grupos completos, semis decididas, final nos pênaltis e 3º lugar
// também nos pênaltis — exercita tabelas, chaveamento, pódio, a linha de
// pênaltis e a seção "Times e integrantes".
const COPA_CHEIA_STEPS = `
  const set = (id, home, away, hp = null, ap = null) => adapter.setMatchScore(id, home, away, hp, ap)
  await set('ga1', 3, 2)
  await set('ga2', 1, 1)
  await set('ga3', 4, 0)
  await set('gb1', 2, 2)
  await set('gb2', 3, 1)
  await set('gb3', 0, 2)
  await set('sf1', 3, 1)
  await set('sf2', 2, 4)
  await set('final', 3, 3, 4, 3)
  await set('third', 2, 2, 2, 4)
  const names = {
    a1: 'Os Clandestinos', a2: 'Resenha FC', a3: 'Bonde da Elétrica',
    b1: 'Time do Povo', b2: 'Vila Nova', b3: 'Atlético Clandestino',
  }
  for (const [id, name] of Object.entries(names)) await adapter.setTeamName(id, name)
  const members = {
    a1: ['Beto', 'Fumaça', 'Juba', 'Nando', 'Tico'],
    a2: ['Biel', 'Dudu', 'Gui', 'Magrão', 'Vini'],
    a3: ['Chico', 'Duda', 'Éder', 'Rafa', 'Zé'],
    b1: ['Cauã', 'Leco', 'Nino', 'Serginho', 'Wand'],
    b2: ['Alemão', 'Buiú', 'Ganso', 'Pedrinho', 'Téo'],
    b3: ['Bibi', 'Cadu', 'Índio', 'Jota', 'Marcelinho'],
  }
  for (const [id, list] of Object.entries(members)) await adapter.setTeamMembers(id, list)
`
const SEED_COPA_CHEIA = BOOT.replace('__RESULT__ = { ok: true }', `
  await adapter.signIn()
  ${COPA_CHEIA_STEPS}
  __RESULT__ = { ok: true }`)

// Mesma chave cheia, mas sem login: é a visão pública da página.
const SEED_COPA_PUBLICA_CHEIA = BOOT.replace('__RESULT__ = { ok: true }', `
  ${COPA_CHEIA_STEPS}
  __RESULT__ = { ok: true }`)

// Edição de ponta a ponta: a organização adiciona um integrante e salva.
const TYPE_MEMBERS = `
  const setNativeValue = (el, value) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const ta = [...document.querySelectorAll('textarea')].find((el) => (el.getAttribute('aria-label') || '').includes('Os Clandestinos'))
  if (ta) {
    setNativeValue(ta, ta.value + '\\nNovato QA')
    await new Promise((r) => setTimeout(r, 300))
    const btn = [...ta.closest('article').querySelectorAll('button')].find((b) => b.textContent.trim() === 'Salvar')
    if (btn) btn.click()
    await new Promise((r) => setTimeout(r, 700))
  }
`

const click = (t) => `{ const btn = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(t)}); if (btn) btn.click() }`
const clickHas = (t) => `{ const btn = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(${JSON.stringify(t)})); if (btn) btn.click() }`
const pause = (ms) => `; await new Promise((r) => setTimeout(r, ${ms}));`

const PRESETS = {
  landing: { path: '/', seed: BOOT },
  'landing-encerrada': { path: '/', seed: BOOT, closed: true },
  identificar: { path: '/entrar', seed: BOOT },
  'identificar-salvo': { path: '/entrar', seed: SEED_DRAFT },
  'identificar-encerrada': { path: '/entrar', seed: SEED_DRAFT, closed: true },
  votar: { path: '/votar', seed: SEED_DRAFT },
  revisar: { path: '/revisar', seed: SEED_DRAFT },
  enviado: { path: '/enviado', seed: SEED_SUBMITTED },
  encerrada: { path: '/encerrada', seed: SEED_SUBMITTED, closed: true },
  regulamento: { path: '/regulamento' },
  privacidade: { path: '/privacidade' },
  admin: { path: '/admin', seed: SEED_BALLOTS },
  'admin-porta': { path: '/admin', seed: BOOT },
  ranking: { path: '/admin', seed: SEED_BALLOTS, act: click('Ranking') + pause(300) },
  times: {
    path: '/admin',
    seed: SEED_BALLOTS,
    act: click('Times') + pause(500) + clickHas('Gerar 6 times') + pause(900),
  },
  cedulas: { path: '/admin', seed: SEED_BALLOTS, act: click('Cédulas') + pause(300) },
  ajustes: { path: '/admin', seed: SEED_BALLOTS, act: click('Ajustes') + pause(300) },
  copa: { path: '/copa', seed: SEED_COPA },
  'copa-publica': { path: '/copa', seed: BOOT },
  'copa-cheia': { path: '/copa', seed: SEED_COPA_CHEIA },
  'copa-publica-cheia': { path: '/copa', seed: SEED_COPA_PUBLICA_CHEIA },
  'copa-times-salvo': { path: '/copa', seed: SEED_COPA_CHEIA, act: TYPE_MEMBERS },
}
const preset = PRESETS[route]
if (!preset) {
  console.error(`rota desconhecida: ${route}\nopções: ${Object.keys(PRESETS).join(', ')}`)
  process.exit(1)
}

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
    '--hide-scrollbars',
    '--mute-audio',
    '--disable-gpu',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    `--window-size=${W},${VH}`,
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
  console.error('shoot-app: timeout')
  kill()
  process.exit(2)
}, 180000)

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
  const logs = []
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

  subs.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails
      logs.push('exception: ' + (d.exception?.description || d.text).split('\n')[0])
    }
  })

  await S('Page.enable')
  await S('Runtime.enable')
  await S('Emulation.setDeviceMetricsOverride', { width: W, height: VH, deviceScaleFactor: DSF, mobile: W < 600 })

  // registra o próximo load ANTES de navegar (uma navegação de hash não dispara load)
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
  const settleAfterLoad = async () => {
    await ev(`new Promise((r) => { const t = performance.now(); (function w() { if (document.readyState === 'complete' && performance.now() - t > 400) r(1); else setTimeout(w, 50) })() })`)
    await ev('document.fonts ? document.fonts.ready.then(() => 1) : 1')
    await sleep(settle)
  }

  // 1. abre o app uma vez para ter o módulo do adaptador disponível
  const l1 = nextLoad()
  await S('Page.navigate', { url: `${base}/` })
  await Promise.race([l1, sleep(20000)])
  await settleAfterLoad()

  // 2. semeia o estado pelo próprio adaptador demo
  let seedResult = null
  if (preset.seed) {
    await ev(`window.__RESULT__ = null; ${preset.seed.replace(/__RESULT__/g, 'window.__RESULT__')}`)
    for (let i = 0; i < 100 && seedResult === null; i += 1) {
      await sleep(50)
      seedResult = await ev('window.__RESULT__')
      if (seedResult && seedResult.error) throw new Error('seed: ' + seedResult.error)
    }
    if (!seedResult) throw new Error('seed não retornou')
    if (preset.closed) {
      // fecha pelo próprio adaptador: o store pode ainda não existir no localStorage
      await ev(
        `(async () => { const { createDemoAdapter } = await import('/src/lib/data/demo.ts'); await createDemoAdapter().setDeadline('2026-11-20T00:00:00-03:00'); return 1 })()`,
      )
    }
  }

  // 3. vai para a rota — a navegação de documento novo já é um boot limpo com o
  // estado semeado (na mesma URL o Chrome recarrega, o que também basta)
  const l2 = nextLoad()
  await S('Page.navigate', { url: `${base}${preset.path}` })
  await Promise.race([l2, sleep(20000)])
  await settleAfterLoad()

  if (preset.act) {
    await ev(`(async () => { ${preset.act}; return 1 })()`)
    await sleep(400)
  }
  if (extraAct) {
    await ev(`(async () => { ${extraAct}; return 1 })()`)
    await sleep(600)
  }

  // 4. confere estouro horizontal e tira a foto
  const audit = await ev(`(() => {
    const vw = window.innerWidth
    const wide = [...document.querySelectorAll('body *')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 1 || r.left < -1) })
      .slice(0, 10)
      .map((e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 3).join('.') : '') + ' → ' + Math.round(e.getBoundingClientRect().right))
    return {
      route: location.pathname + location.hash,
      scrollW: document.documentElement.scrollWidth,
      innerW: vw,
      scrollH: Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)),
      title: document.title,
      wide,
      probe: window.__probe !== undefined ? window.__probe : null,
      text: document.body.innerText.slice(0, 200).replace(/\\s+/g, ' '),
    }
  })()`)

  let clip = null
  if (clipSel) {
    clip = await ev(`(() => {
      const e = document.querySelector(${JSON.stringify(clipSel)})
      if (!e) return null
      const r = e.getBoundingClientRect()
      return { x: Math.max(0, r.x), y: Math.max(0, r.y + scrollY), w: Math.ceil(r.width), h: Math.ceil(r.height) }
    })()`)
    if (!clip) throw new Error(`--clip: nenhum elemento para ${clipSel}`)
  }

  const height = clip ? clip.h : Math.min(audit.scrollH, 14000)
  const { data } = await S('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: clip ? clip.x : 0, y: clip ? clip.y : 0, width: clip ? clip.w : W, height, scale: 1 },
  })
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
  fs.writeFileSync(path.resolve(out), Buffer.from(data, 'base64'))

  console.log(`saved ${out} (${clip ? `${clip.w}x${clip.h}` : `${W}x${height}`}, dsf ${DSF})${clip ? ` · clip ${clipSel}` : ''}`)
  console.log(`  rota ${audit.route} · scrollW ${audit.scrollW} / innerW ${audit.innerW}${audit.scrollW > audit.innerW ? '  ← ESTOURO HORIZONTAL' : ''}`)
  if (audit.wide.length) console.log('  fora da tela: ' + audit.wide.join(' | '))
  if (audit.probe !== null) console.log('  probe: ' + JSON.stringify(audit.probe))
  if (seedResult) console.log('  seed: ' + JSON.stringify(seedResult))
  if (logs.length) console.log(logs.slice(0, 8).join('\n'))
  if (!audit.text) console.log('  AVISO: página vazia')
} catch (e) {
  console.error('shoot-app:', e.message)
  process.exitCode = 1
} finally {
  clearTimeout(guard)
  await sleep(300)
  kill()
}
