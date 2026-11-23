import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { data } from '../lib/data'
import {
  clearVoter,
  newVoterId,
  readVoter,
  saveVoter,
  type VoterCookie,
} from '../lib/cookie'
import { phaseOf } from '../lib/deadline'
import type { Ballot, Phase, Player, PublicState, SessionUser, SubmitResult } from '../lib/types'

type AppContextValue = {
  booting: boolean
  /** Sessão Google — usada só pela organização (painel) e por cédulas antigas. */
  session: SessionUser | null
  /** Identidade de quem vota: cookie do aparelho (ou conta antiga, nas legadas). */
  voterId: string | null
  /** Nome exibido do votante: cédula, cookie ou conta. */
  voterName: string | null
  publicState: PublicState | null
  phase: Phase
  players: Player[]
  ballot: Ballot | null
  isAdmin: boolean
  loadError: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  /** Guarda o nome completo no cookie e assume a identidade deste aparelho. */
  identify: (fullName: string) => Promise<string>
  /** Troca de pessoa: esquece o aparelho (apaga o cookie). */
  forgetVoter: () => Promise<void>
  submit: (
    fullName: string,
    scores: Record<string, number | null>,
  ) => Promise<SubmitResult>
  refresh: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true)
  const [session, setSession] = useState<SessionUser | null>(null)
  const [voter, setVoter] = useState<VoterCookie | null>(() => readVoter())
  const [publicState, setPublicState] = useState<PublicState | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [ballot, setBallot] = useState<Ballot | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const voterId = voter?.id ?? session?.id ?? null
  const voterName = ballot?.fullName ?? voter?.name ?? session?.displayName ?? null

  const loadAll = useCallback(
    async (sess: SessionUser | null, voterNow: VoterCookie | null) => {
      const id = voterNow?.id ?? sess?.id ?? null
      let failure: string | null = null
      try {
        setPlayers(await data.listPlayers())
      } catch (error) {
        failure = error instanceof Error ? error.message : 'Falha ao carregar os dados.'
      }
      if (!id) {
        setBallot(null)
        setIsAdmin(false)
      } else {
        try {
          const [myBallot, admin] = await Promise.all([
            data.getMyBallot(id),
            sess ? data.isAdmin() : Promise.resolve(false),
          ])
          setBallot(myBallot)
          setIsAdmin(admin)
        } catch (error) {
          failure ??= error instanceof Error ? error.message : 'Falha ao carregar os dados.'
        }
      }
      setLoadError(failure)
    },
    [],
  )

  const refresh = useCallback(async () => {
    try {
      const state = await data.getPublicState()
      setPublicState(state)
    } catch {
      // mantém o último estado conhecido
    }
    const sess = await data.getSession()
    setSession(sess)
    const voterNow = readVoter()
    setVoter(voterNow)
    await loadAll(sess, voterNow)
  }, [loadAll])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const state = await data.getPublicState()
        if (!alive) return
        setPublicState(state)
      } catch (error) {
        if (alive) setLoadError(error instanceof Error ? error.message : 'Falha ao carregar.')
      }
      const sess = await data.getSession()
      if (!alive) return
      setSession(sess)
      const voterNow = readVoter()
      if (!alive) return
      setVoter(voterNow)
      await loadAll(sess, voterNow)
      if (alive) setBooting(false)
    })()

    const unsubscribe = data.onAuthChange((user) => {
      setSession(user)
      void loadAll(user, readVoter())
    })

    return () => {
      alive = false
      unsubscribe()
    }
  }, [loadAll])

  // Voltar para a aba revalida tudo: se a organização mexeu nos jogadores (ex.:
  // desativou alguém) enquanto a página estava aberta, quem vota já vê a lista
  // certa ao retomar.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  const signIn = useCallback(async () => {
    await data.signIn()
    const user = await data.getSession()
    setSession(user)
    await loadAll(user, readVoter())
  }, [loadAll])

  const signOut = useCallback(async () => {
    await data.signOut()
    setSession(null)
    await loadAll(null, readVoter())
  }, [loadAll])

  const identify = useCallback(
    async (fullName: string) => {
      const id = voter?.id ?? session?.id ?? newVoterId()
      const next: VoterCookie = { id, name: fullName }
      saveVoter(next)
      setVoter(next)
      try {
        setBallot(await data.getMyBallot(id))
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Falha ao carregar os dados.')
      }
      return id
    },
    [voter, session],
  )

  const forgetVoter = useCallback(async () => {
    clearVoter()
    setVoter(null)
    await refresh()
  }, [refresh])

  const submit = useCallback(
    async (fullName: string, scores: Record<string, number | null>) => {
      const id = voter?.id ?? session?.id ?? null
      if (!id) throw new Error('Escreva seu nome completo antes de votar.')
      const result = await data.submitBallot(id, fullName, scores)
      try {
        setBallot(await data.getMyBallot(id))
      } catch {
        // a cédula foi salva; a próxima carga da página busca de novo
      }
      return result
    },
    [voter, session],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      booting,
      session,
      voterId,
      voterName,
      publicState,
      phase: publicState ? phaseOf(publicState) : 'open',
      players,
      ballot,
      isAdmin,
      loadError,
      signIn,
      signOut,
      identify,
      forgetVoter,
      submit,
      refresh,
    }),
    [
      booting,
      session,
      voterId,
      voterName,
      publicState,
      players,
      ballot,
      isAdmin,
      loadError,
      signIn,
      signOut,
      identify,
      forgetVoter,
      submit,
      refresh,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp precisa estar dentro de <AppProvider>')
  return context
}
