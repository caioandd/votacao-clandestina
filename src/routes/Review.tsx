import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageContainer } from '../components/Layout'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { Button, Kicker } from '../components/ui'
import { useApp } from '../state/AppProvider'
import { clearDraft, loadDraft, saveDraft } from '../hooks/useDraft'
import { isAnswered, missingCount } from '../lib/validation'
import { formatShortDeadline } from '../lib/deadline'

export function Review() {
  const { session, players, ballot, publicState, submit } = useApp()
  const navigate = useNavigate()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initial = useMemo(() => {
    if (!session) {
      return { scores: {} as Record<string, number | null>, fullName: '' }
    }
    const draft = loadDraft(session.id)
    const serverTime = ballot ? new Date(ballot.updatedAt).getTime() : 0
    const useDraft = Boolean(draft && draft.updatedAt > serverTime)
    return {
      scores: useDraft && draft ? draft.scores : (ballot?.scores ?? {}),
      fullName: (useDraft && draft?.fullName) || ballot?.fullName || session.displayName || '',
    }
  }, [session, ballot])

  const [scores, setScores] = useState<Record<string, number | null>>(initial.scores)
  const fullName = initial.fullName

  const missing = missingCount(players, scores)

  if (!session) return null

  const unknownCount = players.filter((player) => scores[player.id] === null).length

  function fillMissingWithUnknown() {
    if (!session) return
    const next = { ...scores }
    for (const player of players) {
      if (!isAnswered(next[player.id])) next[player.id] = null
    }
    setScores(next)
    saveDraft(session.id, { fullName, scores: next, updatedAt: Date.now() })
    window.scrollTo({ top: 0 })
  }

  async function handleSubmit() {
    if (!session) return
    if (missing > 0) {
      setError(`Ainda faltam ${missing} jogadores. Marque as estrelas ou use “Não sei”.`)
      return
    }
    setSending(true)
    setError(null)
    try {
      await submit(fullName, scores)
      clearDraft(session.id)
      navigate('/enviado')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Não foi possível enviar agora. Tente de novo.',
      )
      setSending(false)
    }
  }

  return (
    <AppShell right={<Button variant="quiet" size="sm" onClick={() => navigate('/votar')}>Voltar</Button>}>
      <PageContainer className="py-6 sm:py-8">
        <div className="flex flex-col gap-6 pb-32">
          <header className="flex flex-col gap-3">
            <Kicker>Revisão</Kicker>
            <h1 className="display text-[36px] leading-none text-paper sm:text-[44px]">
              Confira antes de enviar
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-ash">
              Voto de <strong className="font-semibold text-paper">{fullName}</strong>. Depois de
              enviar, você ainda pode editar até {publicState ? formatShortDeadline(publicState.closesAt) : 'o prazo final'}.
            </p>
            {unknownCount > 0 ? (
              <p className="text-[13px] text-ash-600">
                {unknownCount} {unknownCount === 1 ? 'jogador marcado' : 'jogadores marcados'} como
                “Não sei”.
              </p>
            ) : null}
          </header>

          {missing > 0 ? (
            <div className="rounded-[var(--radius-card)] border border-gold/40 bg-gold/8 p-4">
              <p className="text-[14px] font-semibold text-gold">
                {missing} {missing === 1 ? 'jogador sem resposta' : 'jogadores sem resposta'}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ash">
                Toda a lista precisa de uma resposta. Você pode voltar e dar as notas ou marcar os
                que faltam como “Não sei”.
              </p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={fillMissingWithUnknown}>
                Marcar restantes como “Não sei”
              </Button>
            </div>
          ) : null}

          <section aria-label="Resumo dos votos" className="flex flex-col gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between gap-4 rounded-[var(--radius-chip)] border border-line bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold text-paper">
                    {player.fullName}
                  </h3>
                  {player.nickname || player.isGoalkeeper ? (
                    <p className="text-[12px] text-ash-600">
                      {[player.nickname, player.isGoalkeeper ? 'Goleiro' : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0">
                  <ScoreDisplay value={scores[player.id]} />
                </div>
              </div>
            ))}
          </section>
        </div>
      </PageContainer>

      <div className="sticky bottom-0 z-20 border-t border-line bg-ink/92 backdrop-blur-sm">
        <PageContainer className="flex flex-col gap-2 py-3">
          {error ? <p className="text-[13px] font-medium text-crimson">{error}</p> : null}
          <div className="flex items-center justify-between gap-4">
            <span className="tnum text-[13px] text-ash">
              {players.length - missing} de {players.length} respondidos
            </span>
            <Button size="lg" onClick={handleSubmit} disabled={sending}>
              {sending ? 'Enviando…' : 'Enviar votos'}
            </Button>
          </div>
        </PageContainer>
      </div>
    </AppShell>
  )
}
