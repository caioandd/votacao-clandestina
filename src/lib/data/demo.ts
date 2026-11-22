import { ROSTER } from '../roster'
import { createPublicState } from '../deadline'
import type {
  AdminBallot,
  Ballot,
  DataAdapter,
  Player,
  PublicState,
  RankingRow,
  SessionUser,
} from '../types'

/**
 * Modo demonstração — tudo no localStorage.
 * Serve para desenvolver e demonstrar o fluxo completo sem Supabase.
 * NUNCA deve ser usado na votação oficial (o app marca isso na tela).
 */

const KEY = 'cd_votacao_demo_v1'

type DemoBallot = {
  id: string
  voterId: string
  fullName: string
  revision: number
  submittedAt: string
  updatedAt: string
  scores: Record<string, number | null>
}

type DemoStore = {
  players: Player[]
  ballots: DemoBallot[]
  opensAt: string
  closesAt: string
}

const DEMO_USER: SessionUser = {
  id: 'demo-user-0001',
  email: 'conta.demo@ifba.edu.br',
  displayName: 'Conta de Teste',
  avatarUrl: null,
}

function defaultPlayers(): Player[] {
  return ROSTER.map((entry) => ({
    id: `p-${String(entry.n).padStart(2, '0')}`,
    fullName: entry.name,
    nickname: entry.nick ?? null,
    isGoalkeeper: entry.goalkeeper ?? false,
    sortOrder: entry.n,
  }))
}

function defaults(): DemoStore {
  const base = createPublicState()
  return {
    players: defaultPlayers(),
    ballots: [],
    opensAt: base.opensAt,
    closesAt: base.closesAt,
  }
}

function load(): DemoStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as DemoStore
    if (!parsed.players?.length) return defaults()
    return parsed
  } catch {
    return defaults()
  }
}

function save(store: DemoStore) {
  localStorage.setItem(KEY, JSON.stringify(store))
}

const listeners = new Set<(user: SessionUser | null) => void>()
const SESSION_KEY = 'cd_demo_session_v1'
let session: SessionUser | null = (() => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
})()

function setSession(user: SessionUser | null) {
  session = user
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // sem storage: sessão só em memória
  }
  emit()
}

function emit() {
  for (const listener of listeners) listener(session)
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function percentileMedian(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function createDemoAdapter(): DataAdapter {
  const getStore = () => load()

  return {
    mode: 'demo',

    async signIn() {
      setSession(DEMO_USER)
    },

    async signOut() {
      setSession(null)
    },

    async getSession() {
      return session
    },

    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },

    async getPublicState(): Promise<PublicState> {
      const store = getStore()
      return createPublicState({
        opensAt: store.opensAt,
        closesAt: store.closesAt,
        playerCount: store.players.length,
      })
    },

    async listPlayers() {
      return [...getStore().players].sort(
        (a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR') || a.sortOrder - b.sortOrder,
      )
    },

    async getMyBallot(): Promise<Ballot | null> {
      const store = getStore()
      const ballot = store.ballots.find((b) => b.voterId === DEMO_USER.id)
      if (!ballot) return null
      return {
        fullName: ballot.fullName,
        revision: ballot.revision,
        updatedAt: ballot.updatedAt,
        scores: ballot.scores,
      }
    },

    async submitBallot(fullName, scores) {
      const store = getStore()
      const now = new Date().toISOString()
      const existing = store.ballots.find((b) => b.voterId === DEMO_USER.id)
      if (existing) {
        existing.fullName = fullName
        existing.revision += 1
        existing.updatedAt = now
        existing.scores = scores
      } else {
        store.ballots.push({
          id: `b-${Date.now()}`,
          voterId: DEMO_USER.id,
          fullName,
          revision: 1,
          submittedAt: now,
          updatedAt: now,
          scores,
        })
      }
      save(store)
      const updated = store.ballots.find((b) => b.voterId === DEMO_USER.id)!
      return { revision: updated.revision, updatedAt: updated.updatedAt }
    },

    async isAdmin() {
      return true
    },

    async getRanking(): Promise<RankingRow[]> {
      const store = getStore()
      const rows = store.players.map((player) => {
        const values: number[] = []
        let abstentions = 0
        const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        for (const ballot of store.ballots) {
          const score = ballot.scores[player.id]
          if (score === null || score === undefined) {
            abstentions += 1
          } else {
            values.push(score)
            distribution[String(score)] += 1
          }
        }
        const n = values.length
        const mean = n ? values.reduce((a, b) => a + b, 0) / n : null
        return {
          id: player.id,
          fullName: player.fullName,
          nickname: player.nickname,
          isGoalkeeper: player.isGoalkeeper,
          n,
          mean,
          median: percentileMedian(values),
          abstentions,
          bayes: null as number | null,
          distribution,
        }
      })
      const means = rows.filter((r) => r.n > 0).map((r) => r.mean as number)
      const global = means.length ? means.reduce((a, b) => a + b, 0) / means.length : 0
      for (const row of rows) {
        if (!row.n || row.mean === null) continue
        row.bayes = round((row.mean * row.n + 5 * global) / (row.n + 5))
      }
      return rows.sort((a, b) => (b.bayes ?? -1) - (a.bayes ?? -1))
    },

    async listBallots(): Promise<AdminBallot[]> {
      const store = getStore()
      return store.ballots
        .map((b) => ({
          id: b.id,
          fullName: b.fullName,
          email: DEMO_USER.email,
          revision: b.revision,
          submittedAt: b.submittedAt,
          updatedAt: b.updatedAt,
        }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },

    async setGoalkeeper(playerId, value) {
      const store = getStore()
      const player = store.players.find((p) => p.id === playerId)
      if (player) player.isGoalkeeper = value
      save(store)
    },

    async addPlayer(fullName, nickname, isGoalkeeper) {
      const store = getStore()
      const nextOrder = Math.max(0, ...store.players.map((p) => p.sortOrder)) + 1
      store.players.push({
        id: `p-${String(nextOrder).padStart(2, '0')}`,
        fullName,
        nickname,
        isGoalkeeper,
        sortOrder: nextOrder,
      })
      // Espelha o comportamento do banco: quem já votou passa a ter "não sei" no novato.
      for (const ballot of store.ballots) {
        ballot.scores[`p-${String(nextOrder).padStart(2, '0')}`] = null
      }
      save(store)
    },

    async setDeadline(isoDate) {
      const store = getStore()
      store.closesAt = isoDate
      save(store)
    },

    async deleteBallot(ballotId) {
      const store = getStore()
      store.ballots = store.ballots.filter((b) => b.id !== ballotId)
      save(store)
    },

    async seedDemoBallots(count) {
      const store = getStore()
      store.ballots = []
      // "habilidade" escondida por jogador, para o ranking ficar verossímil
      const skill = new Map<string, number>()
      store.players.forEach((player, index) => {
        const base = 5.1 - (index / store.players.length) * 3.1
        skill.set(player.id, Math.min(5, Math.max(1, base)))
      })
      const names = [
        'Ana Beatriz Souza',
        'Bruno Carvalho Lima',
        'Carla Mendes Rocha',
        'Diego Nascimento Alves',
        'Eduarda Pires Costa',
        'Felipe Andrade Santos',
        'Gabriela Moreira Dias',
        'Henrique Barbosa Reis',
        'Isabela Fontes Cruz',
        'João Pedro Ramos',
        'Karina Oliveira Melo',
        'Lucas Amaral Pinto',
        'Mariana Teixeira Braga',
        'Nicolas Ferraz Gomes',
        'Otávio Cardoso Neto',
        'Paula Ribeiro Salles',
        'Rafael Monteiro Paes',
        'Sabrina Duarte Lopes',
        'Thiago Bezerra Maia',
        'Vanessa Castro Reis',
        'Wagner Simões Prado',
        'Yasmin Correia Leal',
        'Zeca Marques Brito',
        'Camila Freitas Nunes',
      ]
      const random = (() => {
        let seed = 42
        return () => {
          seed = (seed * 1103515245 + 12345) % 2147483648
          return seed / 2147483648
        }
      })()

      for (let i = 0; i < Math.min(count, names.length); i += 1) {
        const scores: Record<string, number | null> = {}
        for (const player of store.players) {
          if (random() < 0.18) {
            scores[player.id] = null
            continue
          }
          const base = skill.get(player.id) ?? 3
          const noise = (random() - 0.5) * 1.6
          scores[player.id] = Math.min(5, Math.max(1, Math.round(base + noise)))
        }
        const at = new Date(Date.now() - (names.length - i) * 3600_000).toISOString()
        store.ballots.push({
          id: `b-demo-${i}`,
          voterId: `demo-voter-${i}`,
          fullName: names[i],
          revision: random() < 0.25 ? 2 : 1,
          submittedAt: at,
          updatedAt: at,
          scores,
        })
      }
      save(store)
    },

    async resetDemo() {
      localStorage.removeItem(KEY)
      setSession(null)
    },
  }
}
