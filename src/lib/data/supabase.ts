import { createClient, type User } from '@supabase/supabase-js'
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

export const ALLOWED_DOMAIN = 'ifba.edu.br'

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return /^[^@\s]+@ifba\.edu\.br$/i.test(email)
}

const MESSAGES: Record<string, string> = {
  voting_closed: 'A votação foi encerrada.',
  voting_not_open: 'A votação ainda não abriu.',
  incomplete_ballot: 'Falta avaliar alguns jogadores.',
  invalid_score: 'Uma das notas ficou fora do intervalo de 1 a 5.',
  invalid_name: 'Confira o nome informado.',
  invalid_team_name: 'Use um nome de time de 1 a 40 caracteres.',
  invalid_members:
    'Confira os integrantes: um nome por linha, de 1 a 40 caracteres (no máximo 15 por time).',
  invalid_match_score: 'Placar inválido: use números de 0 a 99 (e pênaltis só no mata-mata empatado).',
  team_not_found: 'Time não encontrado na chave do campeonato.',
  match_not_found: 'Partida não encontrada na chave do campeonato.',
  email_domain_not_allowed: 'Acesso restrito ao e-mail institucional @ifba.edu.br.',
  not_authenticated: 'Entre com o Google para continuar.',
  not_admin: 'Esta conta não tem permissão da organização.',
  player_not_found: 'Jogador não encontrado na lista.',
  not_identified: 'Escreva seu nome completo antes de votar.',
  'Could not find the function':
    'O banco do site ainda não tem esta ação. Rode as migrations 002 a 007 no Supabase (painel → SQL Editor) e tente de novo.',
}

function friendly(message?: string, fallback = 'Não foi possível concluir. Tente de novo.') {
  if (!message) return fallback
  for (const key of Object.keys(MESSAGES)) {
    if (message.includes(key)) return MESSAGES[key]
  }
  return fallback
}

function toUser(user: User | null): SessionUser | null {
  if (!user) return null
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    user.email ||
    'Jogador'
  const avatar =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    null
  return {
    id: user.id,
    email: user.email ?? '',
    displayName: name,
    avatarUrl: avatar,
  }
}

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function createSupabaseAdapter(url: string, anonKey: string): DataAdapter {
  const supabase = createClient(url, anonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  })

  return {
    mode: 'supabase',

    async signIn() {
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { prompt: 'select_account', hd: ALLOWED_DOMAIN },
        },
      })
      if (error) throw new Error(friendly(error.message, 'Não foi possível abrir o login do Google.'))
    },

    async signOut() {
      await supabase.auth.signOut()
    },

    async getSession() {
      const { data } = await supabase.auth.getSession()
      return toUser(data.session?.user ?? null)
    },

    onAuthChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        cb(toUser(session?.user ?? null))
      })
      return () => data.subscription.unsubscribe()
    },

    async getPublicState(): Promise<PublicState> {
      const { data, error } = await supabase.rpc('get_public_state')
      if (error) throw new Error(friendly(error.message))
      const row = (data ?? {}) as Record<string, unknown>
      return {
        opensAt: String(row.opens_at ?? ''),
        closesAt: String(row.closes_at ?? ''),
        playerCount: Number(row.player_count ?? 0),
        resultsPublic: Boolean(row.results_public ?? false),
      }
    },

    async listPlayers(): Promise<Player[]> {
      const { data, error } = await supabase.rpc('get_players')
      if (error) throw new Error(friendly(error.message))
      const rows = (data ?? []) as Record<string, unknown>[]
      return rows.map((row) => ({
        id: String(row.id),
        fullName: String(row.full_name),
        nickname: row.nickname ? String(row.nickname) : null,
        isGoalkeeper: Boolean(row.is_goalkeeper),
        sortOrder: Number(row.sort_order ?? 0),
      }))
    },

    async listAllPlayers(): Promise<AdminPlayerRow[]> {
      const { data, error } = await supabase.rpc('admin_players')
      if (error) throw new Error(friendly(error.message))
      const rows = (data ?? []) as Record<string, unknown>[]
      return rows.map((row) => ({
        id: String(row.id),
        fullName: String(row.full_name),
        nickname: row.nickname ? String(row.nickname) : null,
        isGoalkeeper: Boolean(row.is_goalkeeper),
        active: Boolean(row.active),
        sortOrder: Number(row.sort_order ?? 0),
      }))
    },

    async getMyBallot(voterId: string): Promise<Ballot | null> {
      const { data, error } = await supabase.rpc('voter_get_ballot', { p_voter_id: voterId })
      if (error) throw new Error(friendly(error.message))
      if (!data) return null
      const row = data as Record<string, unknown>
      const scores = (row.scores ?? {}) as Record<string, number | null>
      return {
        fullName: String(row.full_name ?? ''),
        revision: Number(row.revision ?? 1),
        updatedAt: String(row.updated_at ?? ''),
        scores,
      }
    },

    async submitBallot(voterId, fullName, scores) {
      const { data, error } = await supabase.rpc('voter_submit_ballot', {
        p_voter_id: voterId,
        p_full_name: fullName,
        p_scores: scores,
      })
      if (error) throw new Error(friendly(error.message))
      const row = (data ?? {}) as Record<string, unknown>
      return { revision: Number(row.revision ?? 1), updatedAt: String(row.updated_at ?? '') }
    },

    async isAdmin() {
      const { data, error } = await supabase.rpc('is_admin')
      if (error) return false
      return Boolean(data)
    },

    async getRanking(): Promise<RankingRow[]> {
      const { data, error } = await supabase.rpc('admin_ranking')
      if (error) throw new Error(friendly(error.message))
      const rows = (data ?? []) as Record<string, unknown>[]
      return rows.map((row) => ({
        id: String(row.id),
        fullName: String(row.full_name),
        nickname: row.nickname ? String(row.nickname) : null,
        isGoalkeeper: Boolean(row.is_goalkeeper),
        n: Number(row.n ?? 0),
        mean: num(row.mean),
        median: num(row.median),
        abstentions: Number(row.abstentions ?? 0),
        nota: num(row.nota),
        distribution: (row.distribution ?? {}) as Record<string, number>,
      }))
    },

    async listBallots(): Promise<AdminBallot[]> {
      const { data, error } = await supabase.rpc('admin_ballots')
      if (error) throw new Error(friendly(error.message))
      const rows = (data ?? []) as Record<string, unknown>[]
      return rows.map((row) => ({
        id: String(row.id),
        voterId: String(row.voter_id ?? ''),
        fullName: String(row.full_name),
        email: String(row.email ?? ''),
        revision: Number(row.revision ?? 1),
        submittedAt: String(row.submitted_at ?? ''),
        updatedAt: String(row.updated_at ?? ''),
      }))
    },

    async setGoalkeeper(playerId, value) {
      const { error } = await supabase.rpc('admin_set_goalkeeper', {
        p_player_id: playerId,
        p_value: value,
      })
      if (error) throw new Error(friendly(error.message))
    },

    async setPlayerActive(playerId, value) {
      const { error } = await supabase.rpc('admin_set_player_active', {
        p_player_id: playerId,
        p_value: value,
      })
      if (error) throw new Error(friendly(error.message))
    },

    async addPlayer(fullName, nickname, isGoalkeeper) {
      const { error } = await supabase.rpc('admin_add_player', {
        p_full_name: fullName,
        p_nickname: nickname,
        p_is_goalkeeper: isGoalkeeper,
      })
      if (error) throw new Error(friendly(error.message))
    },

    async setDeadline(isoDate) {
      const { error } = await supabase.rpc('admin_set_setting', {
        p_key: 'closes_at',
        p_value: isoDate,
      })
      if (error) throw new Error(friendly(error.message))
    },

    async deleteBallot(ballotId) {
      const { error } = await supabase.rpc('admin_delete_ballot', { p_ballot_id: ballotId })
      if (error) throw new Error(friendly(error.message))
    },

    async clearBallots() {
      const { data, error } = await supabase.rpc('admin_clear_ballots')
      if (error) throw new Error(friendly(error.message))
      return Number(data ?? 0)
    },

    async getTournament(): Promise<Tournament> {
      const { data, error } = await supabase.rpc('get_tournament')
      if (error) throw new Error(friendly(error.message))
      const raw = (data ?? {}) as Record<string, unknown>
      const teams = ((raw.teams ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        name: String(row.name ?? ''),
        groupKey: (String(row.group_key) === 'B' ? 'B' : 'A') as 'A' | 'B',
        sortOrder: Number(row.sort_order ?? 0),
        members: Array.isArray(row.members) ? row.members.map((member) => String(member)) : [],
      }))
      const matches = ((raw.matches ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        stage: String(row.stage) as Tournament['matches'][number]['stage'],
        groupKey:
          row.group_key === 'A' || row.group_key === 'B' ? (row.group_key as 'A' | 'B') : null,
        homeTeamId: row.home_team_id ? String(row.home_team_id) : null,
        awayTeamId: row.away_team_id ? String(row.away_team_id) : null,
        homeScore: num(row.home_score),
        awayScore: num(row.away_score),
        homePens: num(row.home_pens),
        awayPens: num(row.away_pens),
        sortOrder: Number(row.sort_order ?? 0),
      }))
      return { teams, matches }
    },

    async setMatchScore(matchId, homeScore, awayScore, homePens, awayPens) {
      const { error } = await supabase.rpc('admin_set_match_score', {
        p_match_id: matchId,
        p_home_score: homeScore,
        p_away_score: awayScore,
        p_home_pens: homePens,
        p_away_pens: awayPens,
      })
      if (error) throw new Error(friendly(error.message))
    },

    async setTeamName(teamId, name) {
      const { error } = await supabase.rpc('admin_set_team_name', {
        p_team_id: teamId,
        p_name: name,
      })
      if (error) throw new Error(friendly(error.message))
    },

    async setTeamMembers(teamId, members) {
      const { error } = await supabase.rpc('admin_set_team_members', {
        p_team_id: teamId,
        p_members: members,
      })
      if (error) throw new Error(friendly(error.message))
    },
  }
}
