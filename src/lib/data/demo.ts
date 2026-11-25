import { ROSTER } from '../roster'
import { createPublicState } from '../deadline'
import type {
  AdminBallot,
  AdminPlayerRow,
  Ballot,
  DataAdapter,
  Player,
  PublicState,
  RankingRow,
  SessionUser,
  Tournament,
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

/** Jogador no demo carrega o mesmo flag `active` do banco (ausente = ativo). */
type DemoPlayer = Player & { active?: boolean }

type DemoStore = {
  players: DemoPlayer[]
  ballots: DemoBallot[]
  opensAt: string
  closesAt: string
  /** Chave do campeonato (mesmos ids/estrutura do banco — migration 005). */
  tournament: Tournament
}

const DEMO_USER: SessionUser = {
  id: 'demo-user-0001',
  email: 'conta.demo@ifba.edu.br',
  displayName: 'Conta de Teste',
  avatarUrl: null,
}

function defaultPlayers(): DemoPlayer[] {
  return ROSTER.map((entry) => ({
    id: `p-${String(entry.n).padStart(2, '0')}`,
    fullName: entry.name,
    nickname: entry.nick ?? null,
    isGoalkeeper: entry.goalkeeper ?? false,
    sortOrder: entry.n,
    active: true,
  }))
}

/** Chave inicial do campeonato: 6 slots de time e 10 partidas, tudo zerado. */
function defaultTournament(): Tournament {
  const team = (id: string, name: string, groupKey: 'A' | 'B', sortOrder: number) => ({
    id,
    name,
    groupKey,
    sortOrder,
  })
  const match = (
    id: string,
    stage: Tournament['matches'][number]['stage'],
    groupKey: 'A' | 'B' | null,
    homeTeamId: string | null,
    awayTeamId: string | null,
    sortOrder: number,
  ) => ({
    id,
    stage,
    groupKey,
    homeTeamId,
    awayTeamId,
    homeScore: null,
    awayScore: null,
    homePens: null,
    awayPens: null,
    sortOrder,
  })
  return {
    teams: [
      team('a1', 'Time A1', 'A', 1),
      team('a2', 'Time A2', 'A', 2),
      team('a3', 'Time A3', 'A', 3),
      team('b1', 'Time B1', 'B', 1),
      team('b2', 'Time B2', 'B', 2),
      team('b3', 'Time B3', 'B', 3),
    ],
    matches: [
      match('ga1', 'group', 'A', 'a1', 'a2', 1),
      match('ga2', 'group', 'A', 'a1', 'a3', 2),
      match('ga3', 'group', 'A', 'a2', 'a3', 3),
      match('gb1', 'group', 'B', 'b1', 'b2', 4),
      match('gb2', 'group', 'B', 'b1', 'b3', 5),
      match('gb3', 'group', 'B', 'b2', 'b3', 6),
      match('sf1', 'semi', null, null, null, 7),
      match('sf2', 'semi', null, null, null, 8),
      match('final', 'final', null, null, null, 9),
      match('third', 'third', null, null, null, 10),
    ],
  }
}

function defaults(): DemoStore {
  const base = createPublicState()
  return {
    players: defaultPlayers(),
    ballots: [],
    opensAt: base.opensAt,
    closesAt: base.closesAt,
    tournament: defaultTournament(),
  }
}

function load(): DemoStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as DemoStore
    if (!parsed.players?.length) return defaults()
    // stores antigos (sem a chave do campeonato) ganham a chave padrão
    if (!parsed.tournament?.teams?.length || !parsed.tournament?.matches?.length) {
      parsed.tournament = defaultTournament()
    }
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
        playerCount: store.players.filter((player) => player.active !== false).length,
      })
    },

    async listPlayers() {
      return [...getStore().players]
        .filter((player) => player.active !== false)
        .sort(
          (a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR') || a.sortOrder - b.sortOrder,
        )
    },

    async listAllPlayers(): Promise<AdminPlayerRow[]> {
      return [...getStore().players]
        .sort(
          (a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR') || a.sortOrder - b.sortOrder,
        )
        .map((player) => ({
          id: player.id,
          fullName: player.fullName,
          nickname: player.nickname,
          isGoalkeeper: player.isGoalkeeper,
          active: player.active !== false,
          sortOrder: player.sortOrder,
        }))
    },

    async getMyBallot(voterId: string): Promise<Ballot | null> {
      const store = getStore()
      const ballot = store.ballots.find((b) => b.voterId === voterId)
      if (!ballot) return null
      return {
        fullName: ballot.fullName,
        revision: ballot.revision,
        updatedAt: ballot.updatedAt,
        scores: ballot.scores,
      }
    },

    async submitBallot(voterId, fullName, scores) {
      const store = getStore()
      const now = new Date().toISOString()
      const existing = store.ballots.find((b) => b.voterId === voterId)
      if (existing) {
        existing.fullName = fullName
        existing.revision += 1
        existing.updatedAt = now
        existing.scores = scores
      } else {
        store.ballots.push({
          id: `b-${Date.now()}`,
          voterId,
          fullName,
          revision: 1,
          submittedAt: now,
          updatedAt: now,
          scores,
        })
      }
      save(store)
      const updated = store.ballots.find((b) => b.voterId === voterId)!
      return { revision: updated.revision, updatedAt: updated.updatedAt }
    },

    async isAdmin() {
      return true
    },

    async getRanking(): Promise<RankingRow[]> {
      const store = getStore()
      const rows = store.players
        .filter((player) => player.active !== false)
        .map((player) => {
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
        // nota = estrela mais votada (empate: a mais alta)
        let nota: number | null = null
        let best = 0
        for (const star of [5, 4, 3, 2, 1]) {
          const count = distribution[String(star)]
          if (count > best) {
            best = count
            nota = star
          }
        }
        return {
          id: player.id,
          fullName: player.fullName,
          nickname: player.nickname,
          isGoalkeeper: player.isGoalkeeper,
          n,
          mean,
          median: percentileMedian(values),
          abstentions,
          nota,
          distribution,
        }
      })
      return rows.sort((a, b) => {
        const byNota = (b.nota ?? 0) - (a.nota ?? 0)
        if (byNota) return byNota
        const byMean = (b.mean ?? 0) - (a.mean ?? 0)
        if (byMean) return byMean
        return a.fullName.localeCompare(b.fullName)
      })
    },

    async listBallots(): Promise<AdminBallot[]> {
      const store = getStore()
      return store.ballots
        .map((b) => ({
          id: b.id,
          voterId: b.voterId,
          fullName: b.fullName,
          email: '',
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

    async setPlayerActive(playerId, value) {
      const store = getStore()
      const player = store.players.find((p) => p.id === playerId)
      if (!player) return
      player.active = value
      // Espelha o banco: ao reativar, quem já votou passa a ver o jogador como "não sei".
      if (value) {
        for (const ballot of store.ballots) {
          if (!(player.id in ballot.scores)) ballot.scores[player.id] = null
        }
      }
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

    async getTournament(): Promise<Tournament> {
      const store = getStore()
      return {
        teams: store.tournament.teams.map((team) => ({ ...team })),
        matches: store.tournament.matches.map((match) => ({ ...match })),
      }
    },

    async setMatchScore(matchId, homeScore, awayScore, homePens, awayPens) {
      const store = getStore()
      const match = store.tournament.matches.find((m) => m.id === matchId)
      if (!match) throw new Error('Partida não encontrada na chave do campeonato.')
      match.homeScore = homeScore
      match.awayScore = awayScore
      match.homePens = homePens
      match.awayPens = awayPens
      save(store)
    },

    async setTeamName(teamId, name) {
      const store = getStore()
      const team = store.tournament.teams.find((team) => team.id === teamId)
      if (!team) throw new Error('Time não encontrado na chave do campeonato.')
      team.name = name
      save(store)
    },

    async deleteBallot(ballotId) {
      const store = getStore()
      store.ballots = store.ballots.filter((b) => b.id !== ballotId)
      save(store)
    },

    async clearBallots() {
      const store = getStore()
      const total = store.ballots.length
      store.ballots = []
      save(store)
      return total
    },

    async seedDemoBallots(count) {
      const store = getStore()
      store.ballots = []
      const activePlayers = store.players.filter((player) => player.active !== false)
      // "habilidade" escondida por jogador, para o ranking ficar verossímil
      const skill = new Map<string, number>()
      activePlayers.forEach((player, index) => {
        const base = 5.1 - (index / activePlayers.length) * 3.1
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
        for (const player of activePlayers) {
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
