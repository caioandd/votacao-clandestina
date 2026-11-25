import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageContainer } from '../components/Layout'
import { PlayerVoteRow } from '../components/PlayerVoteRow'
import type { Rating } from '../components/StarRating'
import { Button, Kicker } from '../components/ui'
import { Countdown } from '../components/Countdown'
import { useApp } from '../state/AppProvider'
import { useNow } from '../hooks/useNow'
import { loadDraft, saveDraft } from '../hooks/useDraft'
import { answeredCount, missingCount } from '../lib/validation'
import { formatShortDeadline } from '../lib/deadline'

export function Vote() {
  const { voterId, voterName, players, ballot, publicState, loadError, refresh } = useApp()
  const now = useNow(1000)
  const navigate = useNavigate()
  const [scores, setScores] = useState<Record<string, number | null>>({})
  const [ready, setReady] = useState(false)

  // Ao entrar na tela, revalida jogadores e cédula: um jogador desativado pela
  // organização some daqui mesmo que a página já estivesse aberta antes.
  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (ready || !voterId || !publicState) return
    const draft = loadDraft(voterId)
    const serverTime = ballot ? new Date(ballot.updatedAt).getTime() : 0
    const useDraft = Boolean(draft && draft.updatedAt > serverTime)
    setScores(useDraft && draft ? draft.scores : (ballot?.scores ?? {}))
    setReady(true)
  }, [ready, voterId, publicState, ballot])

  const draftName = ballot?.fullName ?? voterName ?? ''

  const answered = useMemo(() => answeredCount(players, scores), [players, scores])
  const missing = useMemo(() => missingCount(players, scores), [players, scores])
  const total = players.length

  function handleChange(playerId: string, value: Rating) {
    if (!voterId) return
    setScores((previous) => {
      const next = { ...previous }
      if (value === undefined) {
        delete next[playerId]
      } else {
        next[playerId] = value
      }
      saveDraft(voterId, { fullName: draftName, scores: next, updatedAt: Date.now() })
      return next
    })
  }

  return (
    <AppShell
      right={
        <>
          {publicState ? <Countdown closesAt={publicState.closesAt} now={now} size="sm" /> : null}
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              navigate('/entrar')
            }}
          >
            Trocar de pessoa
          </Button>
        </>
      }
    >
      <PageContainer className="py-6 sm:py-8">
        <div className="flex flex-col gap-6 pb-28">
          <header className="flex flex-col gap-3">
            <Kicker>Passo 2 de 2</Kicker>
            <h1 className="display text-[36px] leading-none text-paper sm:text-[44px]">
              Dê sua nota
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-ash">
              De 1 a 5 estrelas para cada jogador. Se você não conhece o jogador, marque{' '}
              <strong className="font-semibold text-paper">“Não sei”</strong> — a resposta vale como
              abstenção e não entra na média.
            </p>
            {publicState ? (
              <p className="text-[12px] text-ash-600">
                Voto de {draftName || 'você'} · edição livre até{' '}
                {formatShortDeadline(publicState.closesAt)}
              </p>
            ) : null}
          </header>

          {loadError ? (
            <div className="rounded-[var(--radius-card)] border border-crimson/50 bg-crimson/10 px-4 py-3 text-[13px] leading-relaxed text-crimson">
              {loadError}
            </div>
          ) : null}

          <section aria-label="Lista de jogadores" className="flex flex-col gap-2.5">
            {players.map((player) => (
              <PlayerVoteRow
                key={player.id}
                player={player}
                value={scores[player.id]}
                headingLevel={2}
                onChange={(value) => handleChange(player.id, value)}
              />
            ))}
          </section>

          <p className="text-center text-[12px] text-ash-600">
            Toque na mesma estrela para limpar · use as setas do teclado para navegar
          </p>
        </div>
      </PageContainer>

      <div className="sticky bottom-0 z-20 border-t border-line bg-ink/92 backdrop-blur-sm">
        <PageContainer className="flex items-center justify-between gap-4 py-3">
          <div className="flex flex-col">
            <span className="tnum text-[14px] font-semibold text-paper">
              {answered} de {total} avaliados
            </span>
            <span className="text-[12px] text-ash-600">
              {missing === 0 ? 'Tudo respondido' : `Faltam ${missing}`}
            </span>
          </div>
          <Button onClick={() => navigate('/revisar')} disabled={total === 0}>
            Revisar votos
          </Button>
        </PageContainer>
        <div className="h-1 w-full bg-line" role="presentation">
          <div
            className="h-full bg-gold transition-[width] duration-300 ease-out"
            style={{ width: total ? `${(answered / total) * 100}%` : '0%' }}
          />
        </div>
      </div>
    </AppShell>
  )
}
