import { Link, Navigate } from 'react-router-dom'
import { AppShell, PageContainer } from '../components/Layout'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { Button, Kicker } from '../components/ui'
import { useApp } from '../state/AppProvider'
import { loadDraft } from '../hooks/useDraft'
import { formatDateTime } from '../lib/deadline'

export function Closed() {
  const { session, players, ballot } = useApp()

  if (!session) return <Navigate to="/" replace />

  const draft = loadDraft(session.id)
  const scores = ballot?.scores ?? draft?.scores ?? {}

  return (
    <AppShell>
      <PageContainer className="py-8">
        <div className="flex flex-col gap-7">
          <header className="flex flex-col gap-3">
            <Kicker>Votação encerrada</Kicker>
            <h1 className="display text-[38px] leading-none text-paper sm:text-[46px]">
              O prazo acabou
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-ash">
              {ballot
                ? `Seus votos da versão ${ballot.revision} estão registrados e não podem mais ser alterados.`
                : 'Você não registrou votos nesta votação.'}
              {ballot ? ` Última atualização em ${formatDateTime(ballot.updatedAt)}.` : ''}
            </p>
            <p className="max-w-lg text-[15px] leading-relaxed text-ash">
              A organização já está usando as notas para montar os 6 times equilibrados. O resultado
              é divulgado só pela organização da 3ª Copa Clandestina.
            </p>
          </header>

          {ballot ? (
            <section aria-label="Seus votos" className="flex flex-col gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between gap-4 rounded-[var(--radius-chip)] border border-line bg-surface px-4 py-3"
                >
                  <h2 className="truncate text-[15px] font-semibold text-paper">
                    {player.fullName}
                  </h2>
                  <div className="shrink-0">
                    <ScoreDisplay value={scores[player.id]} />
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/regulamento" className="btn-press inline-flex h-11 items-center justify-center rounded-full border border-line-2 px-6 text-[15px] font-semibold text-paper hover:bg-surface">
              Ver regulamento
            </Link>
            <Button variant="quiet" onClick={() => window.location.assign('#/')}>
              Voltar ao início
            </Button>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  )
}
