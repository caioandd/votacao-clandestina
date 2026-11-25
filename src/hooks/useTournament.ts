import { useCallback, useEffect, useRef, useState } from 'react'
import { data } from '../lib/data'
import type { Tournament } from '../lib/types'

const POLL_MS = 15000

/**
 * Chave do campeonato: carrega, mantém atualizada com polling de 15s (e ao
 * voltar para a aba) e salva placares/nomes da organização na hora.
 * Tabelas e chaveamento são derivados dos dados brutos no cliente.
 */
export function useTournament() {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const next = await data.getTournament()
      if (!alive.current) return
      setTournament(next)
      setError(null)
      setLastSync(new Date())
    } catch (err) {
      if (!alive.current) return
      setError(
        err instanceof Error ? err.message : 'Não foi possível carregar a tabela do campeonato.',
      )
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    alive.current = true
    void refresh()
    const interval = setInterval(() => {
      if (!document.hidden) void refresh()
    }, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive.current = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const saveScore = useCallback(
    async (
      matchId: string,
      homeScore: number | null,
      awayScore: number | null,
      homePens: number | null,
      awayPens: number | null,
    ) => {
      await data.setMatchScore(matchId, homeScore, awayScore, homePens, awayPens)
      await refresh()
    },
    [refresh],
  )

  const saveTeamName = useCallback(
    async (teamId: string, name: string) => {
      await data.setTeamName(teamId, name)
      await refresh()
    },
    [refresh],
  )

  return { tournament, loading, error, lastSync, refresh, saveScore, saveTeamName }
}
