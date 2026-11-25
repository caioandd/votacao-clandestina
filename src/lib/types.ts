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
  /** Identificador do aparelho (cookie) ou conta antiga; vazio em bases antigas. */
  voterId: string
  fullName: string
  /** Só as cédulas antigas (com login) têm e-mail; o resto vem vazio. */
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

/** Time da chave do campeonato (página /copa). Slots fixos a1..a3 / b1..b3. */
export type TournamentTeam = {
  id: string
  name: string
  groupKey: 'A' | 'B'
  sortOrder: number
}

export type TournamentStage = 'group' | 'semi' | 'final' | 'third'

export type TournamentMatch = {
  id: string
  stage: TournamentStage
  groupKey: 'A' | 'B' | null
  /** Só as partidas de grupo têm times fixos; as eliminatórias saem da tabela. */
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number | null
  awayScore: number | null
  /** Pênaltis: só em mata-mata empatado no tempo normal. */
  homePens: number | null
  awayPens: number | null
  sortOrder: number
}

export type Tournament = {
  teams: TournamentTeam[]
  matches: TournamentMatch[]
}

export type DataAdapter = {
  mode: 'demo' | 'supabase'
  /** Login da organização (Google no Supabase; sessão simulada no demo). */
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  getSession: () => Promise<SessionUser | null>
  onAuthChange: (cb: (user: SessionUser | null) => void) => () => void
  getPublicState: () => Promise<PublicState>
  listPlayers: () => Promise<Player[]>
  /** Painel: todos os jogadores, inclusive os desativados. */
  listAllPlayers: () => Promise<AdminPlayerRow[]>
  /** Cédula do aparelho (voterId do cookie) — ou da conta antiga, nas legadas. */
  getMyBallot: (voterId: string) => Promise<Ballot | null>
  submitBallot: (
    voterId: string,
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
  /** Chave do campeonato (/copa): leitura pública, escrita só da organização. */
  getTournament: () => Promise<Tournament>
  setMatchScore: (
    matchId: string,
    homeScore: number | null,
    awayScore: number | null,
    homePens: number | null,
    awayPens: number | null,
  ) => Promise<void>
  setTeamName: (teamId: string, name: string) => Promise<void>
  deleteBallot: (ballotId: string) => Promise<void>
  /** Apaga todas as cédulas e notas. Retorna quantas cédulas foram removidas. */
  clearBallots: () => Promise<number>
  /** Só no modo demonstração: gera cédulas sintéticas para testar o ranking. */
  seedDemoBallots?: (count: number) => Promise<void>
  /** Só no modo demonstração: apaga todos os dados locais. */
  resetDemo?: () => Promise<void>
}
