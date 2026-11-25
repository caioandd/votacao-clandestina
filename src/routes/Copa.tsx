import { useEffect, useMemo, useState } from 'react'
import { AppShell, PageContainer } from '../components/Layout'
import { Badge, Button, Kicker, Spinner } from '../components/ui'
import { cn } from '../lib/cn'
import { TZ } from '../lib/deadline'
import {
  buildView,
  groupMatches,
  slotName,
  type BracketMatch,
  type GroupTable,
  type Slot,
  type TournamentView,
} from '../lib/tournament'
import type { TournamentMatch, TournamentTeam } from '../lib/types'
import { useTournament } from '../hooks/useTournament'
import { useApp } from '../state/AppProvider'

type SaveScoreFn = (
  matchId: string,
  homeScore: number | null,
  awayScore: number | null,
  homePens: number | null,
  awayPens: number | null,
) => Promise<void>

const clockFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function Copa() {
  const { isAdmin } = useApp()
  const { tournament, error, lastSync, refresh, saveScore, saveTeamName } = useTournament()
  const view = useMemo(() => (tournament ? buildView(tournament) : null), [tournament])
  const teamsById = useMemo(() => {
    const map = new Map<string, TournamentTeam>()
    for (const team of tournament?.teams ?? []) map.set(team.id, team)
    return map
  }, [tournament])

  const groupA = tournament ? groupMatches(tournament, 'A') : []
  const groupB = tournament ? groupMatches(tournament, 'B') : []

  return (
    <AppShell subtitle="Tabela do campeonato">
      <PageContainer className="py-8">
        <div className="flex min-w-0 flex-col gap-8">
          <header className="flex min-w-0 flex-col gap-3">
            <Kicker>3ª Copa Clandestina · 28/11 às 8h · IFBA</Kicker>
            <h1 className="display text-[34px] leading-none text-paper sm:text-[42px]">
              Tabela do campeonato
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-ash">
              Dois grupos de três times — todos se enfrentam dentro do grupo. Os dois melhores de
              cada grupo avançam: <strong className="text-paper">1º do A × 2º do B</strong> e{' '}
              <strong className="text-paper">2º do A × 1º do B</strong>. Quem vence vai à final;
              quem perde disputa o 3º lugar.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ash-600">
              <span className="inline-flex items-center gap-2 text-ash">
                <span className="h-2 w-2 animate-pulse rounded-full bg-gold" aria-hidden="true" />
                Ao vivo
              </span>
              {lastSync ? <span>Atualizado às {clockFormat.format(lastSync)}</span> : null}
              {isAdmin ? (
                <span className="text-gold">
                  Organização: toque no placar para editar e use Salvar.
                </span>
              ) : null}
            </div>
          </header>

          {error && !tournament ? (
            <section className="min-w-0 rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <p className="text-[14px] text-paper">{error}</p>
              <p className="mt-1 text-[12px] text-ash-600">
                Se o problema continuar, a organização precisa rodar a migration 005 no Supabase.
              </p>
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={() => void refresh()}>
                  Tentar de novo
                </Button>
              </div>
            </section>
          ) : !view ? (
            <div className="py-10">
              <Spinner label="Carregando a tabela…" />
            </div>
          ) : (
            <>
              {error ? (
                <p className="text-[12px] text-crimson">{error} — mostrando os últimos dados.</p>
              ) : null}

              {view.podium.champion?.kind === 'team' ? <PodiumCard podium={view.podium} /> : null}

              <section aria-label="Fase de grupos" className="grid min-w-0 gap-4 lg:grid-cols-2">
                <GroupCard
                  table={view.tables.A}
                  matches={groupA}
                  teamsById={teamsById}
                  isAdmin={isAdmin}
                  onSave={saveScore}
                />
                <GroupCard
                  table={view.tables.B}
                  matches={groupB}
                  teamsById={teamsById}
                  isAdmin={isAdmin}
                  onSave={saveScore}
                />
              </section>

              <section aria-label="Mata-mata" className="flex min-w-0 flex-col gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <h2 className="display text-[24px] text-paper">Mata-mata</h2>
                  <p className="text-[13px] leading-relaxed text-ash">
                    Semifinais cruzadas: 1º do A × 2º do B e 2º do A × 1º do B. Em jogo empatado,
                    os pênaltis decidem quem avança.
                  </p>
                </div>
                <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                  {view.semis.map((bracketMatch, index) => (
                    <KnockoutCard
                      key={bracketMatch.match.id}
                      title={`Semifinal ${index + 1}`}
                      hint="Sai direto da tabela dos grupos."
                      bracketMatch={bracketMatch}
                      isAdmin={isAdmin}
                      onSave={saveScore}
                    />
                  ))}
                </div>
                <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                  {view.final ? (
                    <KnockoutCard
                      title="Final"
                      hint="Vencedores das semifinais."
                      bracketMatch={view.final}
                      isAdmin={isAdmin}
                      onSave={saveScore}
                    />
                  ) : null}
                  {view.third ? (
                    <KnockoutCard
                      title="Disputa de 3º lugar"
                      hint="Perdedores das semifinais."
                      bracketMatch={view.third}
                      isAdmin={isAdmin}
                      onSave={saveScore}
                    />
                  ) : null}
                </div>
              </section>

              {isAdmin && tournament ? (
                <NamesSection teams={tournament.teams} onSave={saveTeamName} />
              ) : null}
            </>
          )}
        </div>
      </PageContainer>
    </AppShell>
  )
}

function PodiumCard({ podium }: { podium: TournamentView['podium'] }) {
  if (podium.champion?.kind !== 'team') return null
  const rows: [string, Slot | null][] = [
    ['2º lugar', podium.runnerUp],
    ['3º lugar', podium.third],
    ['4º lugar', podium.fourth],
  ]
  return (
    <section className="min-w-0 rounded-[var(--radius-card)] border border-gold/40 bg-gold/5 p-4 sm:p-5">
      <Kicker className="text-gold">Campeão</Kicker>
      <p className="display mt-1 text-[30px] leading-none text-paper">{podium.champion.name}</p>
      <dl className="mt-4 grid min-w-0 grid-cols-3 gap-3">
        {rows.map(([label, slot]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ash-600">
              {label}
            </dt>
            <dd className="mt-0.5 truncate text-[14px] font-semibold text-paper">
              {slot?.kind === 'team' ? slot.name : '—'}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function GroupCard({
  table,
  matches,
  teamsById,
  isAdmin,
  onSave,
}: {
  table: GroupTable
  matches: TournamentMatch[]
  teamsById: Map<string, TournamentTeam>
  isAdmin: boolean
  onSave: SaveScoreFn
}) {
  const slotFor = (teamId: string | null): Slot => {
    const team = teamId ? teamsById.get(teamId) : undefined
    return team
      ? { kind: 'team', teamId: team.id, name: team.name }
      : { kind: 'pending', label: 'A definir' }
  }

  return (
    <section
      aria-label={`Grupo ${table.groupKey}`}
      className="flex min-w-0 flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h2 className="display text-[18px] text-paper">Grupo {table.groupKey}</h2>
        <Badge tone="outline">2 classificam</Badge>
      </div>

      <table className="w-full border-collapse text-[11px] tabular-nums sm:text-[12px]">
        <caption className="sr-only">Classificação do grupo {table.groupKey}</caption>
        <thead>
          <tr className="text-ash-600">
            <th scope="col" className="w-6 py-1 pl-2 text-left font-semibold">
              #
            </th>
            <th scope="col" className="py-1 pr-2 text-left font-semibold">
              Time
            </th>
            <th scope="col" className="w-6 py-1 text-center font-semibold">
              P
            </th>
            <th scope="col" className="w-6 py-1 text-center font-semibold">
              J
            </th>
            <th scope="col" className="w-6 py-1 text-center font-semibold">
              V
            </th>
            <th scope="col" className="w-6 py-1 text-center font-semibold">
              E
            </th>
            <th scope="col" className="w-6 py-1 text-center font-semibold">
              D
            </th>
            <th scope="col" className="w-7 py-1 text-center font-semibold">
              GP
            </th>
            <th scope="col" className="w-7 py-1 text-center font-semibold">
              GC
            </th>
            <th scope="col" className="w-8 py-1 pr-1 text-center font-semibold">
              SG
            </th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.teamId} className="border-t border-line">
              <td
                className={cn(
                  'w-6 border-l-2 py-2 pl-1.5 text-left text-ash',
                  row.position <= 2 ? 'border-gold' : 'border-transparent',
                )}
              >
                {row.position}
              </td>
              <td className="max-w-[7.5rem] truncate py-2 pr-2 font-semibold text-paper sm:max-w-[12rem]">
                {row.name}
              </td>
              <td className="py-2 text-center font-semibold text-paper">{row.points}</td>
              <td className="py-2 text-center">{row.played}</td>
              <td className="py-2 text-center">{row.wins}</td>
              <td className="py-2 text-center">{row.draws}</td>
              <td className="py-2 text-center">{row.losses}</td>
              <td className="py-2 text-center">{row.goalsFor}</td>
              <td className="py-2 text-center">{row.goalsAgainst}</td>
              <td className="py-2 pr-1 text-center">
                {row.diff > 0 ? `+${row.diff}` : row.diff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[11px] leading-relaxed text-ash-600">
        Os dois primeiros avançam. Desempate: pontos, saldo, gols pró, confronto direto.
      </p>
      {table.tieWarning ? (
        <p className="text-[11px] leading-relaxed text-crimson">
          Times empatados em todos os critérios — a organização decide quem passa.
        </p>
      ) : null}

      <div className="flex min-w-0 flex-col divide-y divide-line border-t border-line">
        {matches.map((match) => (
          <div key={match.id} className="min-w-0 py-2.5 first:pt-3">
            <ScoreLine
              match={match}
              home={slotFor(match.homeTeamId)}
              away={slotFor(match.awayTeamId)}
              isAdmin={isAdmin}
              onSave={onSave}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

function KnockoutCard({
  title,
  hint,
  bracketMatch,
  isAdmin,
  onSave,
}: {
  title: string
  hint?: string
  bracketMatch: BracketMatch
  isAdmin: boolean
  onSave: SaveScoreFn
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ash">{title}</h3>
        {bracketMatch.winner ? <Badge tone="gold">Encerrado</Badge> : null}
      </div>
      <ScoreLine
        match={bracketMatch.match}
        home={bracketMatch.home}
        away={bracketMatch.away}
        winner={bracketMatch.winner}
        isAdmin={isAdmin}
        onSave={onSave}
      />
      {hint ? <p className="text-[11px] text-ash-600">{hint}</p> : null}
    </section>
  )
}

function parseScore(value: string): number | null | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (!/^\d{1,2}$/.test(trimmed)) return undefined
  return Number(trimmed)
}

/**
 * Placar de uma partida.
 * Grupo: uma linha "Time 3 × 2 Time", com campos quando a organização está logada.
 * Mata-mata: placar de duas linhas (nome + gols), com pênaltis em caso de
 * empate e a linha do vencedor quando o jogo está decidido.
 */
function ScoreLine({
  match,
  home,
  away,
  winner,
  isAdmin,
  onSave,
}: {
  match: TournamentMatch
  home: Slot
  away: Slot
  winner?: 'home' | 'away' | null
  isAdmin: boolean
  onSave: SaveScoreFn
}) {
  const knockout = match.stage !== 'group'
  const resolved = home.kind === 'team' && away.kind === 'team'
  const fmt = (value: number | null) => (value === null ? '' : String(value))

  const [homeInput, setHomeInput] = useState(() => fmt(match.homeScore))
  const [awayInput, setAwayInput] = useState(() => fmt(match.awayScore))
  const [homePensInput, setHomePensInput] = useState(() => fmt(match.homePens))
  const [awayPensInput, setAwayPensInput] = useState(() => fmt(match.awayPens))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  // quando o valor do servidor muda (outra pessoa salvou ou o refresh chegou),
  // espelha no campo — parado o suficiente para não atrapalhar quem digita
  useEffect(() => {
    setHomeInput(fmt(match.homeScore))
  }, [match.homeScore])
  useEffect(() => {
    setAwayInput(fmt(match.awayScore))
  }, [match.awayScore])
  useEffect(() => {
    setHomePensInput(fmt(match.homePens))
  }, [match.homePens])
  useEffect(() => {
    setAwayPensInput(fmt(match.awayPens))
  }, [match.awayPens])

  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSaved(false), 2500)
    return () => clearTimeout(timer)
  }, [justSaved])

  const dirty =
    homeInput.trim() !== fmt(match.homeScore) ||
    awayInput.trim() !== fmt(match.awayScore) ||
    (knockout &&
      (homePensInput.trim() !== fmt(match.homePens) ||
        awayPensInput.trim() !== fmt(match.awayPens)))

  const hs = parseScore(homeInput)
  const as = parseScore(awayInput)
  const showPens = knockout && hs !== undefined && as !== undefined && hs !== null && hs === as

  async function handleSave() {
    if (!resolved) return
    if (hs === undefined || as === undefined) {
      setError('Placar inválido: use números de 0 a 99.')
      return
    }
    if ((hs === null) !== (as === null)) {
      setError('Preencha os dois placares — ou deixe os dois vazios para limpar o jogo.')
      return
    }
    let sendHomePens: number | null = null
    let sendAwayPens: number | null = null
    if (knockout && hs !== null && hs === as) {
      const hp = parseScore(homePensInput)
      const ap = parseScore(awayPensInput)
      if (hp === undefined || ap === undefined) {
        setError('Placar inválido: use números de 0 a 99.')
        return
      }
      if (hp === null || ap === null) {
        setError('Empate no mata-mata: preencha os pênaltis para dizer quem passou.')
        return
      }
      if (hp === ap) {
        setError('Nos pênaltis um time precisa ter mais gols.')
        return
      }
      sendHomePens = hp
      sendAwayPens = ap
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(match.id, hs, as, sendHomePens, sendAwayPens)
      setJustSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  const teamTone = (slot: Slot) => (slot.kind === 'team' ? 'text-paper' : 'text-ash-600')
  const inputClass =
    'shrink-0 rounded-[8px] border border-line-2 bg-ink text-center font-semibold tabular-nums text-paper outline-none transition-colors focus:border-gold disabled:opacity-50'
  const winnerName =
    winner === 'home' ? slotName(home) : winner === 'away' ? slotName(away) : null

  const saveRow =
    isAdmin && resolved && (dirty || saving || justSaved || error) ? (
      <div className="flex min-w-0 items-center justify-end gap-3">
        {error ? (
          <span className="min-w-0 flex-1 text-right text-[11px] leading-snug text-crimson">
            {error}
          </span>
        ) : justSaved && !dirty ? (
          <span className="text-[11px] text-success">Salvo</span>
        ) : null}
        <Button size="sm" variant="ghost" disabled={!dirty || saving} onClick={() => void handleSave()}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    ) : null

  if (knockout) {
    const fixture = (slot: Slot, value: number | null, side: 'home' | 'away') => (
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span
          className={cn('min-w-0 flex-1 truncate text-[15px] font-semibold', teamTone(slot))}
          title={slotName(slot)}
        >
          {slotName(slot)}
        </span>
        {isAdmin && resolved ? (
          <input
            value={side === 'home' ? homeInput : awayInput}
            onChange={(event) => {
              if (side === 'home') setHomeInput(event.target.value)
              else setAwayInput(event.target.value)
              setJustSaved(false)
            }}
            disabled={saving}
            inputMode="numeric"
            maxLength={2}
            placeholder="–"
            aria-label={`Gols de ${slotName(slot)}`}
            className={cn(inputClass, 'h-10 w-12 text-[15px]')}
          />
        ) : (
          <span className="shrink-0 tabular-nums text-[16px] font-semibold text-paper">
            {value ?? '–'}
          </span>
        )}
      </div>
    )

    return (
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          {fixture(home, match.homeScore, 'home')}
          {fixture(away, match.awayScore, 'away')}
        </div>

        {showPens ? (
          <div className="flex min-w-0 items-center justify-center gap-2">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-ash-600">
              Pênaltis
            </span>
            {isAdmin && resolved ? (
              <>
                <input
                  value={homePensInput}
                  onChange={(event) => {
                    setHomePensInput(event.target.value)
                    setJustSaved(false)
                  }}
                  disabled={saving}
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="0"
                  aria-label={`Pênaltis de ${slotName(home)}`}
                  className={cn(inputClass, 'h-10 w-12 text-[15px]')}
                />
                <span className="text-ash-600">×</span>
                <input
                  value={awayPensInput}
                  onChange={(event) => {
                    setAwayPensInput(event.target.value)
                    setJustSaved(false)
                  }}
                  disabled={saving}
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="0"
                  aria-label={`Pênaltis de ${slotName(away)}`}
                  className={cn(inputClass, 'h-10 w-12 text-[15px]')}
                />
              </>
            ) : (
              <span className="tabular-nums text-[15px] font-semibold text-paper">
                {match.homePens ?? '–'} × {match.awayPens ?? '–'}
              </span>
            )}
          </div>
        ) : null}

        {winnerName ? (
          <p className="text-[12px] text-ash">
            Vencedor: <strong className="text-paper">{winnerName}</strong>
          </p>
        ) : null}

        {saveRow}

        {!resolved ? (
          <p className="text-[11px] text-ash-600">
            {isAdmin
              ? 'Aguardando a definição dos times para liberar o placar.'
              : 'Aguardando a definição dos times.'}
          </p>
        ) : null}
      </div>
    )
  }

  // partida de grupo: "Time 3 × 2 Time"
  if (!isAdmin) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn('min-w-0 flex-1 truncate text-right text-[13px] font-semibold', teamTone(home))}
          title={slotName(home)}
        >
          {slotName(home)}
        </span>
        <span className="shrink-0 whitespace-nowrap px-1 text-[14px] font-semibold tabular-nums text-paper">
          {match.homeScore ?? '–'} × {match.awayScore ?? '–'}
        </span>
        <span
          className={cn('min-w-0 flex-1 truncate text-[13px] font-semibold', teamTone(away))}
          title={slotName(away)}
        >
          {slotName(away)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn('min-w-0 flex-1 truncate text-right text-[13px] font-semibold', teamTone(home))}
          title={slotName(home)}
        >
          {slotName(home)}
        </span>
        {resolved ? (
          <span className="flex shrink-0 items-center gap-1">
            <input
              value={homeInput}
              onChange={(event) => {
                setHomeInput(event.target.value)
                setJustSaved(false)
              }}
              disabled={saving}
              inputMode="numeric"
              maxLength={2}
              placeholder="–"
              aria-label={`Gols de ${slotName(home)}`}
              className={cn(inputClass, 'h-8 w-10 text-[13px]')}
            />
            <span className="text-ash-600">×</span>
            <input
              value={awayInput}
              onChange={(event) => {
                setAwayInput(event.target.value)
                setJustSaved(false)
              }}
              disabled={saving}
              inputMode="numeric"
              maxLength={2}
              placeholder="–"
              aria-label={`Gols de ${slotName(away)}`}
              className={cn(inputClass, 'h-8 w-10 text-[13px]')}
            />
          </span>
        ) : (
          <span className="shrink-0 px-2 text-[15px] text-ash-600">— × —</span>
        )}
        <span
          className={cn('min-w-0 flex-1 truncate text-[13px] font-semibold', teamTone(away))}
          title={slotName(away)}
        >
          {slotName(away)}
        </span>
      </div>
      {saveRow}
      {!resolved ? (
        <p className="text-center text-[11px] text-ash-600">
          Aguardando a definição dos times para liberar o placar.
        </p>
      ) : null}
    </div>
  )
}

function NamesSection({
  teams,
  onSave,
}: {
  teams: TournamentTeam[]
  onSave: (teamId: string, name: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  return (
    <section className="min-w-0 rounded-[var(--radius-card)] border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-0 items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold text-paper">Editar nomes dos times</span>
          <span className="text-[12px] text-ash-600">
            Os seis slots da chave, editáveis só pela organização.
          </span>
        </span>
        <span className="shrink-0 text-[12px] font-semibold text-gold">
          {open ? 'Fechar' : 'Abrir'}
        </span>
      </button>
      {open ? (
        <div className="grid min-w-0 gap-4 border-t border-line p-4 sm:grid-cols-2">
          {(['A', 'B'] as const).map((groupKey) => (
            <div key={groupKey} className="flex min-w-0 flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ash-600">
                Grupo {groupKey}
              </p>
              {teams
                .filter((team) => team.groupKey === groupKey)
                .map((team) => (
                  <TeamNameRow key={team.id} team={team} onSave={onSave} />
                ))}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function TeamNameRow({
  team,
  onSave,
}: {
  team: TournamentTeam
  onSave: (teamId: string, name: string) => Promise<void>
}) {
  const [value, setValue] = useState(team.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setValue(team.name)
  }, [team.name])

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(timer)
  }, [saved])

  const trimmed = value.trim()
  const dirty = trimmed !== team.name
  const invalid = trimmed.length === 0 || trimmed.length > 40

  async function handleSave() {
    if (invalid) {
      setError('Use um nome de 1 a 40 caracteres.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(team.id, trimmed)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <input
          value={value}
          maxLength={40}
          disabled={saving}
          onChange={(event) => {
            setValue(event.target.value)
            setSaved(false)
          }}
          aria-label={`Nome do time no slot ${team.id.toUpperCase()}`}
          className="h-10 min-w-0 flex-1 rounded-[8px] border border-line-2 bg-ink px-3 text-[14px] text-paper outline-none transition-colors focus:border-gold disabled:opacity-50"
        />
        <Button size="sm" variant="ghost" disabled={!dirty || saving} onClick={() => void handleSave()}>
          {saving ? '…' : 'Salvar'}
        </Button>
      </div>
      {error ? <p className="text-[11px] text-crimson">{error}</p> : null}
      {saved && !dirty ? <p className="text-[11px] text-success">Nome atualizado.</p> : null}
    </div>
  )
}
