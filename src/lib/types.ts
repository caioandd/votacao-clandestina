export type Player = {
  id: string
  fullName: string
  nickname: string | null
  isGoalkeeper: boolean
  sortOrder: number
}

/** Linha do painel (Ajustes): inclui desativados; a votação só usa os ativos. */
export type AdminPlayerRow = {
  id: string
  fullName: string
  nickname: string | null
  isGoalkeeper: boolean
  active: boolean
  sortOrder: number
}

export type SessionUser = {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
}

export type Ballot = {
  fullName: string
  revision: number
  updatedAt: string
  scores: Record<string, number | null>
}

export type RankingRow = {
  id: string
  fullName: string
  nickname: string | null
  isGoalkeeper: boolean
  n: number
  mean: number | null
  median: number | null
  abstentions: number
  /** Estrela inteira mais votada (1–5); empate resolve pela estrela mais alta. */
  nota: number | null
  distribution: Record<string, number>
}

export type AdminBallot = {
  id: string
  fullName: string
  email: string
  revision: number
  submittedAt: string
  updatedAt: string
}

export type PublicState = {
  opensAt: string
  closesAt: string
  playerCount: number
  resultsPublic: boolean
}

export type Phase = 'before' | 'open' | 'closed'

export type SubmitResult = {
  revision: number
  updatedAt: string
}

export type TeamDraft = {
  id: string
  createdAt: string
  teams: { name: string; playerIds: string[] }[]
  params: Record<string, unknown>
}

export type DataAdapter = {
  mode: 'demo' | 'supabase'
  /** Abre o fluxo de login (Google no Supabase; sessão simulada no demo). */
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  getSession: () => Promise<SessionUser | null>
  onAuthChange: (cb: (user: SessionUser | null) => void) => () => void
  getPublicState: () => Promise<PublicState>
  listPlayers: () => Promise<Player[]>
  /** Painel: todos os jogadores, inclusive os desativados. */
  listAllPlayers: () => Promise<AdminPlayerRow[]>
  getMyBallot: () => Promise<Ballot | null>
  submitBallot: (
    fullName: string,
    scores: Record<string, number | null>,
  ) => Promise<SubmitResult>
  isAdmin: () => Promise<boolean>
  getRanking: () => Promise<RankingRow[]>
  listBallots: () => Promise<AdminBallot[]>
  setGoalkeeper: (playerId: string, value: boolean) => Promise<void>
  /** Painel: desativa/reativa um jogador (desistência). */
  setPlayerActive: (playerId: string, value: boolean) => Promise<void>
  addPlayer: (fullName: string, nickname: string | null, isGoalkeeper: boolean) => Promise<void>
  setDeadline: (isoDate: string) => Promise<void>
  deleteBallot: (ballotId: string) => Promise<void>
  /** Apaga todas as cédulas e notas. Retorna quantas cédulas foram removidas. */
  clearBallots: () => Promise<number>
  /** Só no modo demonstração: gera cédulas sintéticas para testar o ranking. */
  seedDemoBallots?: (count: number) => Promise<void>
  /** Só no modo demonstração: apaga todos os dados locais. */
  resetDemo?: () => Promise<void>
}
