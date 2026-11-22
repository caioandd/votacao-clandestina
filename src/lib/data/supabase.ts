import { createClient, type User } from '@supabase/supabase-js'
import type {
  AdminBallot,
  Ballot,
  DataAdapter,
  Player,
  PublicState,
  RankingRow,
  SessionUser,
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
  email_domain_not_allowed: 'Acesso restrito ao e-mail institucional @ifba.edu.br.',
  not_authenticated: 'Entre com o Google para continuar.',
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
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, nickname, is_goalkeeper, sort_order')
        .eq('active', true)
        .order('full_name', { ascending: true })
      if (error) throw new Error(friendly(error.message))
      return (data ?? []).map((row) => ({
        id: String(row.id),
        fullName: String(row.full_name),
        nickname: row.nickname ? String(row.nickname) : null,
        isGoalkeeper: Boolean(row.is_goalkeeper),
        sortOrder: Number(row.sort_order ?? 0),
      }))
    },

    async getMyBallot(): Promise<Ballot | null> {
      const { data, error } = await supabase.rpc('get_my_ballot')
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

    async submitBallot(fullName, scores) {
      const { data, error } = await supabase.rpc('submit_ballot', {
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
        bayes: num(row.bayes),
        distribution: (row.distribution ?? {}) as Record<string, number>,
      }))
    },

    async listBallots(): Promise<AdminBallot[]> {
      const { data, error } = await supabase.rpc('admin_ballots')
      if (error) throw new Error(friendly(error.message))
      const rows = (data ?? []) as Record<string, unknown>[]
      return rows.map((row) => ({
        id: String(row.id),
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
  }
}
