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
import { isAllowedEmail } from '../lib/data/supabase'
import { phaseOf } from '../lib/deadline'
import type { Ballot, Phase, Player, PublicState, SessionUser, SubmitResult } from '../lib/types'

type AppContextValue = {
  booting: boolean
  session: SessionUser | null
  emailAllowed: boolean
  publicState: PublicState | null
  phase: Phase
  players: Player[]
  ballot: Ballot | null
  isAdmin: boolean
  loadError: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
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
  const [publicState, setPublicState] = useState<PublicState | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [ballot, setBallot] = useState<Ballot | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const emailAllowed = session ? isAllowedEmail(session.email) : false

  const loadForUser = useCallback(async (user: SessionUser | null) => {
    if (!user) {
      setPlayers([])
      setBallot(null)
      setIsAdmin(false)
      return
    }
    if (!isAllowedEmail(user.email)) {
      setPlayers([])
      setBallot(null)
      setIsAdmin(false)
      return
    }
    try {
      const [list, myBallot, admin] = await Promise.all([
        data.listPlayers(),
        data.getMyBallot(),
        data.isAdmin(),
      ])
      setPlayers(list)
      setBallot(myBallot)
      setIsAdmin(admin)
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Falha ao carregar os dados.')
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const state = await data.getPublicState()
      setPublicState(state)
    } catch {
      // mantém o último estado conhecido
    }
    const user = await data.getSession()
    setSession(user)
    await loadForUser(user)
  }, [loadForUser])

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
      const user = await data.getSession()
      if (!alive) return
      setSession(user)
      await loadForUser(user)
      if (alive) setBooting(false)
    })()

    const unsubscribe = data.onAuthChange((user) => {
      setSession(user)
      void loadForUser(user)
    })

    return () => {
      alive = false
      unsubscribe()
    }
  }, [loadForUser])

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
    await loadForUser(user)
  }, [loadForUser])

  const signOut = useCallback(async () => {
    await data.signOut()
    setSession(null)
    await loadForUser(null)
  }, [loadForUser])

  const submit = useCallback(
    async (fullName: string, scores: Record<string, number | null>) => {
      const result = await data.submitBallot(fullName, scores)
      const fresh = await data.getMyBallot()
      setBallot(fresh)
      return result
    },
    [],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      booting,
      session,
      emailAllowed,
      publicState,
      phase: publicState ? phaseOf(publicState) : 'open',
      players,
      ballot,
      isAdmin,
      loadError,
      signIn,
      signOut,
      submit,
      refresh,
    }),
    [
      booting,
      session,
      emailAllowed,
      publicState,
      players,
      ballot,
      isAdmin,
      loadError,
      signIn,
      signOut,
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
