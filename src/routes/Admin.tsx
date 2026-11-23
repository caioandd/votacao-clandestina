import { useEffect, useMemo, useState } from 'react'
import { AppShell, PageContainer, DemoBadge } from '../components/Layout'
import { Button, Kicker, Spinner } from '../components/ui'
import { useApp } from '../state/AppProvider'
import { data } from '../lib/data'
import type { AdminBallot, AdminPlayerRow, RankingRow } from '../lib/types'
import { copyText, downloadFile } from '../lib/csv'
import {
  exportTeamsCsv,
  exportTeamsText,
  generateTeams,
  swapPlayers,
  teamStats,
  type Team,
  type TeamPlayer,
} from '../lib/teams'
import { cn } from '../lib/cn'
import { formatDateTime, fromLocalInputValue, toLocalInputValue } from '../lib/deadline'
import { checkFullName } from '../lib/validation'
import { clearDraft } from '../hooks/useDraft'

type Tab = 'ranking' | 'times' | 'cedulas' | 'ajustes'

const TABS: { id: Tab; label: string }[] = [
  { id: 'ranking', label: 'Ranking' },
  { id: 'times', label: 'Times' },
  { id: 'cedulas', label: 'Cédulas' },
  { id: 'ajustes', label: 'Ajustes' },
]

function Distribution({ distribution }: { distribution: Record<string, number> }) {
  const counts = [1, 2, 3, 4, 5].map((score) => distribution[String(score)] ?? 0)
  const total = counts.reduce((a, b) => a + b, 0)
  if (!total) return <span className="text-[12px] text-ash-600">sem votos</span>
  return (
    <div className="flex h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-surface-2">
      {counts.map((count, index) => {
        const score = index + 1
        if (!count) return null
        return (
          <span
            key={score}
            title={`${score} estrela${score > 1 ? 's' : ''}: ${count}`}
            style={{
              width: `${(count / total) * 100}%`,
              background: 'var(--color-gold)',
              opacity: 0.22 + index * 0.18,
            }}
          />
        )
      })}
    </div>
  )
}

export function Admin() {
  const { session, players, publicState, isAdmin, refresh, signOut } = useApp()
  const [tab, setTab] = useState<Tab>('ranking')
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [ballots, setBallots] = useState<AdminBallot[]>([])
  const [adminPlayers, setAdminPlayers] = useState<AdminPlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const load = useMemo(
    () => async () => {
      setLoading(true)
      try {
        const [rows, list] = await Promise.all([data.getRanking(), data.listBallots()])
        setRanking(rows)
        setBallots(list)
        try {
          setAdminPlayers(await data.listAllPlayers())
        } catch {
          // Banco ainda sem a migration 003 (admin_players): o painel segue
          // funcionando com os jogadores ativos; desativar/reativar avisa erro.
          const active = await data.listPlayers()
          setAdminPlayers(active.map((player) => ({ ...player, active: true })))
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Falha ao carregar o painel.')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const seedDemoBallots = data.seedDemoBallots
  const resetDemo = data.resetDemo

  useEffect(() => {
    if (isAdmin) void load()
  }, [isAdmin, load])

  if (!session) return null

  if (!isAdmin) {
    return (
      <AppShell>
        <PageContainer className="flex flex-1 items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="display text-[32px] text-paper">Painel restrito</h1>
            <p className="max-w-sm text-[15px] text-ash">
              Esta área é da organização da 3ª Copa Clandestina.
            </p>
            <Button variant="ghost" onClick={() => { void signOut() }}>
              Trocar de conta
            </Button>
          </div>
        </PageContainer>
      </AppShell>
    )
  }

  const totalBallots = ballots.length
  const inactiveCount = adminPlayers.filter((player) => !player.active).length

  return (
    <AppShell
      right={
        <>
          <span className="hidden sm:inline-flex">
            <DemoBadge />
          </span>
          <Button variant="quiet" size="sm" onClick={() => { void refresh(); void load() }}>
            Atualizar
          </Button>
        </>
      }
    >
      <PageContainer className="py-6">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <Kicker>Organização</Kicker>
            <h1 className="display text-[34px] leading-none text-paper sm:text-[42px]">
              Painel da votação
            </h1>
            <p className="tnum text-[13px] text-ash">
              {totalBallots} {totalBallots === 1 ? 'cédula registrada' : 'cédulas registradas'} ·{' '}
              {players.length} {players.length === 1 ? 'jogador ativo' : 'jogadores ativos'}
              {inactiveCount
                ? ` · ${inactiveCount} ${inactiveCount === 1 ? 'inativo' : 'inativos'}`
                : null}
              {publicState ? ` · fecha ${formatDateTime(publicState.closesAt)}` : null}
            </p>
          </header>

          <nav className="flex flex-wrap gap-2" aria-label="Seções do painel">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id}
                className={cn(
                  'btn-press h-10 rounded-full px-5 text-[14px] font-semibold',
                  tab === item.id
                    ? 'bg-gold text-ink'
                    : 'border border-line-2 text-ash hover:border-ash-600 hover:text-paper',
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {message ? (
            <div className="rounded-[var(--radius-card)] border border-crimson/50 bg-crimson/10 px-4 py-3 text-[13px] text-crimson">
              {message}
            </div>
          ) : null}

          {loading ? (
            <Spinner label="Carregando dados" />
          ) : (
            <>
              {tab === 'ranking' ? (
                <RankingTab ranking={ranking} onExport={() => {
                  const header = 'pos,jogador,apelido,goleiro,votos,media,mediana,nota,abstencoes,1,2,3,4,5'
                  const lines = ranking.map((row, index) =>
                    [
                      index + 1,
                      `"${row.fullName}"`,
                      `"${row.nickname ?? ''}"`,
                      row.isGoalkeeper ? 'sim' : 'nao',
                      row.n,
                      row.mean?.toFixed(3) ?? '',
                      row.median?.toFixed(3) ?? '',
                      row.nota ?? '',
                      row.abstentions,
                      row.distribution['1'] ?? 0,
                      row.distribution['2'] ?? 0,
                      row.distribution['3'] ?? 0,
                      row.distribution['4'] ?? 0,
                      row.distribution['5'] ?? 0,
                    ].join(','),
                  )
                  downloadFile('ranking-3a-copa.csv', [header, ...lines].join('\n'))
                }} />
              ) : null}

              {tab === 'times' ? <TeamsTab ranking={ranking} /> : null}

              {tab === 'cedulas' ? (
                <BallotsTab
                  ballots={ballots}
                  onDelete={async (id) => {
                    if (!window.confirm('Apagar esta cédula? A pessoa poderá votar de novo.')) return
                    await data.deleteBallot(id)
                    await load()
                  }}
                  onClearAll={async () => {
                    if (
                      !window.confirm(
                        `Apagar TODAS as ${ballots.length} ${ballots.length === 1 ? 'cédula' : 'cédulas'} e todas as notas? Esta ação não pode ser desfeita — cada pessoa poderá votar de novo.`,
                      )
                    ) {
                      return
                    }
                    setMessage(null)
                    try {
                      const removed = await data.clearBallots()
                      setMessage(
                        `${removed} ${removed === 1 ? 'cédula apagada' : 'cédulas apagadas'}. O pessoal já pode votar de novo.`,
                      )
                      await load()
                    } catch (error) {
                      setMessage(
                        error instanceof Error ? error.message : 'Não foi possível limpar os votos.',
                      )
                    }
                  }}
                  onSeed={
                    seedDemoBallots
                      ? async () => {
                          await seedDemoBallots(24)
                          await load()
                        }
                      : undefined
                  }
                  onReset={
                    resetDemo
                      ? async () => {
                          if (!window.confirm('Apagar todos os dados locais da demonstração?')) return
                          await resetDemo()
                          window.location.assign('#/')
                        }
                      : undefined
                  }
                />
              ) : null}

              {tab === 'ajustes' ? (
                <SettingsTab
                  players={adminPlayers}
                  closesAt={publicState?.closesAt ?? ''}
                  onChange={async () => {
                    await refresh()
                    await load()
                    if (session) clearDraft(session.id)
                  }}
                  onMessage={setMessage}
                />
              ) : null}
            </>
          )}
        </div>
      </PageContainer>
    </AppShell>
  )
}

function RankingTab({ ranking, onExport }: { ranking: RankingRow[]; onExport: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const voted = ranking.filter((row) => row.n > 0)
  const global = voted.length
    ? voted.reduce((acc, row) => acc + (row.mean ?? 0), 0) / voted.length
    : null

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-[13px] leading-relaxed text-ash-600">
          <strong className="text-ash">Nota</strong> é a estrela que mais apareceu nos votos (empate:
          vale a estrela mais alta) — ex.: 4 votos de 3★ e 2 de 4★ = nota 3★. É a nota que ordena o
          ranking e os times; empate na nota desempata pela média. Toque no nome para ver os votos
          por estrela.
        </p>
        <Button variant="ghost" size="sm" onClick={onExport} disabled={!ranking.length}>
          Baixar CSV
        </Button>
      </div>

      {global !== null ? (
        <p className="tnum text-[13px] text-ash">
          Média geral: <span className="font-semibold text-paper">{global.toFixed(2)}</span>
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {ranking.map((row, index) => {
          const isOpen = expanded === row.id
          return (
            <article
              key={row.id}
              className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="tnum display w-8 text-[20px] text-ash-600">{index + 1}</span>
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-paper">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : row.id)}
                        aria-expanded={isOpen}
                        className="text-left hover:text-gold"
                      >
                        {row.fullName}
                        {row.nickname ? (
                          <span className="ml-2 text-[12px] font-normal text-ash-600">
                            {row.nickname}
                          </span>
                        ) : null}
                        <span aria-hidden className="ml-2 text-[11px] text-ash-600">
                          {isOpen ? '▾' : '▸'}
                        </span>
                      </button>
                    </h3>
                    <p className="tnum text-[12px] text-ash-600">
                      {row.n} {row.n === 1 ? 'voto' : 'votos'} · média {row.mean?.toFixed(2) ?? '—'} ·
                      mediana {row.median?.toFixed(1) ?? '—'} · {row.abstentions} “não sei”
                      {row.isGoalkeeper ? ' · goleiro' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-ash-600">nota</span>
                  <span className="display tnum text-[24px] text-gold">
                    {row.nota !== null ? `${row.nota}★` : '—'}
                  </span>
                </div>
              </div>

              {isOpen ? <StarBreakdown row={row} /> : null}

              <Distribution distribution={row.distribution} />
            </article>
          )
        })}
      </div>
    </section>
  )
}

function StarBreakdown({ row }: { row: RankingRow }) {
  return (
    <div className="rounded-[var(--radius-chip)] border border-line bg-surface-2 px-4 py-2">
      <table className="tnum w-full max-w-[300px] text-[13px]">
        <caption className="sr-only">Votos por quantidade de estrelas — {row.fullName}</caption>
        <thead>
          <tr>
            <th className="pb-1 text-left text-[11px] font-normal uppercase tracking-[0.16em] text-ash-600">
              Estrelas
            </th>
            <th className="pb-1 text-right text-[11px] font-normal uppercase tracking-[0.16em] text-ash-600">
              Votos
            </th>
          </tr>
        </thead>
        <tbody>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = row.distribution[String(star)] ?? 0
            const isNota = row.nota === star && count > 0
            return (
              <tr key={star}>
                <td className={cn('py-0.5 pr-4', isNota ? 'font-semibold text-gold' : 'text-ash')}>
                  {star}★
                  {isNota ? (
                    <span className="ml-2 text-[10px] uppercase tracking-[0.16em]">nota</span>
                  ) : null}
                </td>
                <td
                  className={cn(
                    'py-0.5 text-right',
                    isNota ? 'font-semibold text-gold' : 'text-ash',
                  )}
                >
                  {count}
                </td>
              </tr>
            )
          })}
          <tr>
            <td className="border-t border-line pt-1 pr-4 text-ash-600">não sei</td>
            <td className="border-t border-line pt-1 text-right text-ash-600">{row.abstentions}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function TeamsTab({ ranking }: { ranking: RankingRow[] }) {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [selected, setSelected] = useState<{ teamIndex: number; playerId: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const pool: TeamPlayer[] = ranking.map((row) => ({
    id: row.id,
    name: row.nickname ? `${row.fullName} (${row.nickname})` : row.fullName,
    score: row.nota ?? row.mean ?? 3,
    isGoalkeeper: row.isGoalkeeper,
  }))

  const outfield = pool.filter((p) => !p.isGoalkeeper)
  const restoTimes = outfield.length % 6

  function handleGenerate() {
    const result = generateTeams(pool, { teamCount: 6 })
    setTeams(result.teams)
    setSelected(null)
  }

  function handlePlayerClick(teamIndex: number, playerId: string) {
    if (!selected) {
      setSelected({ teamIndex, playerId })
      return
    }
    if (selected.teamIndex === teamIndex && selected.playerId === playerId) {
      setSelected(null)
      return
    }
    setTeams((previous) =>
      previous ? swapPlayers(previous, selected, { teamIndex, playerId }) : previous,
    )
    setSelected(null)
  }

  const stats = teams ? teamStats(teams) : null

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleGenerate} disabled={!outfield.length}>
          {teams ? 'Gerar de novo' : 'Gerar 6 times'}
        </Button>
        {teams ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await copyText(exportTeamsText(teams))
                setCopied(ok)
                window.setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? 'Copiado!' : 'Copiar para WhatsApp'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadFile('times-3a-copa.csv', exportTeamsCsv(teams))}
            >
              Baixar CSV
            </Button>
          </>
        ) : null}
      </div>

      <p className="max-w-lg text-[13px] leading-relaxed text-ash-600">
        Snake draft pela ordem da nota + ajuste fino automático para as médias ficarem próximas. Os{' '}
        {pool.length - outfield.length} goleiros ficam fora da divisão. Toque em um jogador e depois
        em outro para trocar de time.
      </p>

      {restoTimes > 0 ? (
        <p className="rounded-[var(--radius-card)] border border-gold/40 bg-gold/8 px-4 py-3 text-[13px] leading-relaxed text-ash">
          <strong className="text-gold">Atenção:</strong> {outfield.length} jogadores de linha não
          dividem igualmente em 6 times — {restoTimes}{' '}
          {restoTimes === 1 ? 'time fica' : 'times ficam'} com um jogador a mais. Números iguais
          exigem um total múltiplo de 6 (hoje: {Math.ceil(outfield.length / 6) * 6}).
        </p>
      ) : null}

      {stats ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
          <span className="tnum text-[13px] text-ash">
            Diferença entre o mais forte e o mais fraco:{' '}
            <strong className="text-paper">{stats.delta.toFixed(3)}</strong>
          </span>
          <span className="tnum text-[13px] text-ash">
            Desvio médio: <strong className="text-paper">{stats.spread.toFixed(3)}</strong>
          </span>
        </div>
      ) : null}

      {teams ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, teamIndex) => (
            <article
              key={team.name}
              className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-4"
            >
              <header className="flex items-baseline justify-between gap-2 border-b border-line pb-2">
                <h3 className="display text-[20px] text-paper">{team.name}</h3>
                <span className="tnum text-[13px] font-semibold text-gold">
                  {team.mean.toFixed(2)}
                </span>
              </header>
              <p className="tnum text-[11px] text-ash-600">
                {team.players.length} jogadores · soma {team.sum.toFixed(1)} · mediana{' '}
                {team.median.toFixed(1)}
              </p>
              <ul className="flex flex-col gap-1">
                {team.players.map((player) => {
                  const isSelected =
                    selected?.teamIndex === teamIndex && selected.playerId === player.id
                  return (
                    <li key={player.id}>
                      <button
                        type="button"
                        onClick={() => handlePlayerClick(teamIndex, player.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 text-left text-[14px] transition-colors',
                          isSelected
                            ? 'bg-gold/20 text-paper ring-1 ring-gold'
                            : 'text-ash hover:bg-surface-2 hover:text-paper',
                        )}
                      >
                        <span className="truncate">{player.name}</span>
                        <span className="tnum shrink-0 text-[12px] text-ash-600">
                          {player.score.toFixed(2)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-center text-[14px] text-ash">
          Sem times gerados ainda. Rode a geração depois que as cédulas começarem a chegar.
        </div>
      )}
    </section>
  )
}

function BallotsTab({
  ballots,
  onDelete,
  onClearAll,
  onSeed,
  onReset,
}: {
  ballots: AdminBallot[]
  onDelete: (id: string) => void
  onClearAll?: () => void
  onSeed?: () => void
  onReset?: () => void
}) {
  return (
    <section className="flex flex-col gap-4">
      {onSeed || onReset ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-gold/40 bg-gold/8 p-4">
          <p className="text-[13px] text-ash">
            Modo demonstração: os botões abaixo criam dados falsos só para testar o ranking.
          </p>
          <div className="flex gap-2">
            {onSeed ? (
              <Button variant="ghost" size="sm" onClick={onSeed}>
                Gerar 24 cédulas de teste
              </Button>
            ) : null}
            {onReset ? (
              <Button variant="danger" size="sm" onClick={onReset}>
                Zera a demonstração
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() =>
          downloadFile(
            'cedulas-3a-copa.csv',
            [
              'id,nome,email,versao,enviado_em,atualizado_em',
              ...ballots.map((ballot) =>
                [
                  ballot.id,
                  `"${ballot.fullName}"`,
                  ballot.email,
                  ballot.revision,
                  ballot.submittedAt,
                  ballot.updatedAt,
                ].join(','),
              ),
            ].join('\n'),
          )
        }
        disabled={!ballots.length}
      >
        Baixar CSV
      </Button>

      <div className="flex flex-col gap-2">
        {ballots.map((ballot) => (
          <article
            key={ballot.id}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-chip)] border border-line bg-surface px-4 py-3"
          >
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold text-paper">{ballot.fullName}</h3>
              <p className="truncate text-[12px] text-ash-600">
                {ballot.email} · versão {ballot.revision} · {formatDateTime(ballot.updatedAt)}
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={() => onDelete(ballot.id)}>
              Apagar
            </Button>
          </article>
        ))}
        {!ballots.length ? (
          <p className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-center text-[14px] text-ash">
            Nenhuma cédula registrada ainda.
          </p>
        ) : null}
      </div>

      {onClearAll ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-crimson/40 bg-crimson/8 p-4">
          <h2 className="text-[15px] font-semibold text-paper">Limpar votos</h2>
          <p className="max-w-lg text-[13px] leading-relaxed text-ash-600">
            Apaga <strong className="text-ash">todas</strong> as cédulas e notas de uma vez, para
            recomeçar a votação do zero. Vai pedir confirmação antes, e não tem como desfazer.
          </p>
          <Button
            variant="danger"
            size="sm"
            className="self-start"
            onClick={onClearAll}
            disabled={!ballots.length}
          >
            Apagar todos os votos{ballots.length ? ` (${ballots.length})` : ''}
          </Button>
        </div>
      ) : null}
    </section>
  )
}

function SettingsTab({
  players,
  closesAt,
  onChange,
  onMessage,
}: {
  players: AdminPlayerRow[]
  closesAt: string
  onChange: () => Promise<void>
  onMessage: (message: string | null) => void
}) {
  const [deadline, setDeadline] = useState(closesAt ? toLocalInputValue(closesAt) : '')
  const [newName, setNewName] = useState('')
  const [newNick, setNewNick] = useState('')
  const [newGk, setNewGk] = useState(false)
  const [busy, setBusy] = useState(false)

  const activePlayers = players.filter((player) => player.active)

  useEffect(() => {
    if (closesAt) setDeadline(toLocalInputValue(closesAt))
  }, [closesAt])

  async function run(action: () => Promise<void>, okMessage: string) {
    setBusy(true)
    onMessage(null)
    try {
      await action()
      await onChange()
      onMessage(okMessage)
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-[16px] font-semibold text-paper">Prazo final</h2>
        <p className="text-[13px] text-ash-600">
          Horário de Brasília. Depois desse momento o servidor recusa qualquer envio ou edição.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <input
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            className="h-12 rounded-[var(--radius-chip)] border border-line bg-surface px-4 text-[15px] text-paper focus:border-gold"
          />
          <Button
            disabled={busy || !deadline}
            onClick={() =>
              run(() => data.setDeadline(fromLocalInputValue(deadline)), 'Prazo atualizado.')
            }
          >
            Salvar prazo
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[16px] font-semibold text-paper">Quem é goleiro</h2>
        <p className="text-[13px] text-ash-600">
          Goleiros votam normalmente, mas ficam fora da divisão dos 6 times. Só jogadores ativos
          aparecem aqui.
        </p>
        <div className="flex flex-col gap-1.5">
          {activePlayers.map((player) => (
            <label
              key={player.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-chip)] border border-line bg-surface px-4 py-2.5"
            >
              <span className="text-[14px] text-paper">
                {player.fullName}
                {player.nickname ? (
                  <span className="ml-2 text-[12px] text-ash-600">{player.nickname}</span>
                ) : null}
              </span>
              <input
                type="checkbox"
                checked={player.isGoalkeeper}
                disabled={busy}
                onChange={(event) =>
                  run(
                    () => data.setGoalkeeper(player.id, event.target.checked),
                    `${player.fullName} atualizado.`,
                  )
                }
                className="h-5 w-5 accent-gold"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[16px] font-semibold text-paper">Ativos na votação</h2>
        <p className="text-[13px] text-ash-600">
          Use quando alguém desistir: desmarque para o jogador sair da votação e do ranking. Os
          votos que ele já recebeu ficam guardados — se ele voltar, é só marcar de novo, e quem já
          votou passa a vê-lo como “não sei” para completar até o prazo.
        </p>
        <div className="flex flex-col gap-1.5">
          {players.map((player) => (
            <label
              key={player.id}
              className={cn(
                'flex items-center justify-between gap-3 rounded-[var(--radius-chip)] border border-line bg-surface px-4 py-2.5',
                !player.active && 'opacity-60',
              )}
            >
              <span className="text-[14px] text-paper">
                {player.fullName}
                {player.nickname ? (
                  <span className="ml-2 text-[12px] text-ash-600">{player.nickname}</span>
                ) : null}
                {!player.active ? (
                  <span className="ml-2 text-[12px] text-ash-600">inativo</span>
                ) : null}
              </span>
              <input
                type="checkbox"
                checked={player.active}
                disabled={busy}
                title={
                  player.active
                    ? 'Desmarcar tira o jogador da votação'
                    : 'Marcar devolve o jogador à votação'
                }
                onChange={(event) => {
                  const value = event.target.checked
                  if (
                    !value &&
                    !window.confirm(
                      `${player.fullName} sai da votação e do ranking. Os votos já recebidos ficam guardados. Desativar?`,
                    )
                  ) {
                    return
                  }
                  void run(
                    () => data.setPlayerActive(player.id, value),
                    value
                      ? `${player.fullName} voltou para a votação.`
                      : `${player.fullName} saiu da votação.`,
                  )
                }}
                className="h-5 w-5 accent-gold"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[16px] font-semibold text-paper">Adicionar jogador</h2>
        <p className="text-[13px] text-ash-600">
          Use quando o nome que faltou aparecer. Quem já votou passa a ver o jogador novo como “não
          sei” e pode editar o voto até o prazo.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] uppercase tracking-[0.2em] text-ash-600">Nome completo</span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Ex.: Fulano de Tal"
              className="h-12 w-64 rounded-[var(--radius-chip)] border border-line bg-surface px-4 text-[15px] text-paper placeholder:text-ash-600 focus:border-gold"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] uppercase tracking-[0.2em] text-ash-600">Apelido</span>
            <input
              value={newNick}
              onChange={(event) => setNewNick(event.target.value)}
              placeholder="opcional"
              className="h-12 w-40 rounded-[var(--radius-chip)] border border-line bg-surface px-4 text-[15px] text-paper placeholder:text-ash-600 focus:border-gold"
            />
          </label>
          <label className="flex h-12 items-center gap-2 text-[14px] text-ash">
            <input
              type="checkbox"
              checked={newGk}
              onChange={(event) => setNewGk(event.target.checked)}
              className="h-5 w-5 accent-gold"
            />
            Goleiro
          </label>
          <Button
            disabled={busy}
            onClick={() => {
              const check = checkFullName(newName)
              if (!check.ok) {
                onMessage(check.error)
                return
              }
              void run(
                () => data.addPlayer(check.value, newNick.trim() || null, newGk),
                `${check.value} entrou na lista.`,
              ).then(() => {
                setNewName('')
                setNewNick('')
                setNewGk(false)
              })
            }}
          >
            Adicionar
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[16px] font-semibold text-paper">Rascunho das cédulas</h2>
        <p className="text-[13px] text-ash-600">
          O rascunho de quem já votou fica no navegador da pessoa. Ao reabrir, o app compara com a
          cédula do servidor e usa sempre a versão mais recente.
        </p>
      </div>
    </section>
  )
}
