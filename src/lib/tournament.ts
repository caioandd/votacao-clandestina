import type { Tournament, TournamentMatch, TournamentStage, TournamentTeam } from './types'

/**
 * Cálculo da chave do campeonato (página /copa), tudo derivado dos placares
 * brutos — nada é armazenado calculado, então a tabela e o chaveamento andam
 * sempre juntos com o último resultado salvo.
 *
 * Critérios da tabela do grupo, nesta ordem: pontos → saldo de gols → gols
 * pró → confronto direto (mini-tabela entre os empatados) → nome.
 */

export type Standing = {
  teamId: string
  name: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  diff: number
  points: number
}

export type StandingRow = Standing & { position: number }

export type GroupTable = {
  groupKey: 'A' | 'B'
  rows: StandingRow[]
  /** Todos os jogos do grupo já têm placar. */
  complete: boolean
  /** Ainda empatado em TODOS os critérios: a organização decide no sorteio. */
  tieWarning: boolean
}

export type Slot =
  | { kind: 'team'; teamId: string; name: string }
  | { kind: 'pending'; label: string }

export type BracketMatch = {
  match: TournamentMatch
  home: Slot
  away: Slot
  /** Definido só com os dois times em campo e placar salvo (pênaltis desempatam). */
  winner: 'home' | 'away' | null
}

export type TournamentView = {
  tables: { A: GroupTable; B: GroupTable }
  semis: BracketMatch[]
  final: BracketMatch | null
  third: BracketMatch | null
  podium: {
    champion: Slot | null
    runnerUp: Slot | null
    third: Slot | null
    fourth: Slot | null
  }
}

type Tally = Standing

function isPlayed(match: TournamentMatch): boolean {
  return match.homeScore !== null && match.awayScore !== null
}

/** Mini-tabela: só partidas entre os times informados. */
function tally(teams: TournamentTeam[], matches: TournamentMatch[]): Map<string, Tally> {
  const map = new Map<string, Tally>()
  for (const team of teams) {
    map.set(team.id, {
      teamId: team.id,
      name: team.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      diff: 0,
      points: 0,
    })
  }
  for (const match of matches) {
    if (!isPlayed(match) || !match.homeTeamId || !match.awayTeamId) continue
    const home = map.get(match.homeTeamId)
    const away = map.get(match.awayTeamId)
    if (!home || !away) continue
    const hs = match.homeScore as number
    const as = match.awayScore as number
    home.played += 1
    away.played += 1
    home.goalsFor += hs
    home.goalsAgainst += as
    away.goalsFor += as
    away.goalsAgainst += hs
    if (hs > as) {
      home.wins += 1
      away.losses += 1
      home.points += 3
    } else if (hs < as) {
      away.wins += 1
      home.losses += 1
      away.points += 3
    } else {
      home.draws += 1
      away.draws += 1
      home.points += 1
      away.points += 1
    }
  }
  for (const row of map.values()) row.diff = row.goalsFor - row.goalsAgainst
  return map
}

function generalOrder(a: Tally, b: Tally): number {
  return (
    b.points - a.points ||
    b.diff - a.diff ||
    b.goalsFor - a.goalsFor ||
    a.name.localeCompare(b.name, 'pt-BR')
  )
}

function miniOrder(a: Tally, b: Tally): number {
  return (
    b.points - a.points ||
    b.diff - a.diff ||
    b.goalsFor - a.goalsFor ||
    a.name.localeCompare(b.name, 'pt-BR')
  )
}

export function groupMatches(tournament: Tournament, groupKey: 'A' | 'B'): TournamentMatch[] {
  return tournament.matches
    .filter((match) => match.stage === 'group' && match.groupKey === groupKey)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

export function computeGroupTable(tournament: Tournament, groupKey: 'A' | 'B'): GroupTable {
  const teams = tournament.teams.filter((team) => team.groupKey === groupKey)
  const matches = groupMatches(tournament, groupKey)
  const stats = tally(teams, matches)
  const complete = matches.length > 0 && matches.every(isPlayed)

  // ordena pelas colunas gerais…
  const order = [...teams]
    .map((team) => team.id)
    .sort((a, b) => generalOrder(stats.get(a)!, stats.get(b)!))

  // …e desempata, em cada bloco de empatados, pela mini-tabela do confronto
  let tieWarning = false
  let i = 0
  while (i < order.length) {
    const sameColumns = (a: string, b: string) => {
      const sa = stats.get(a)!
      const sb = stats.get(b)!
      return sa.points === sb.points && sa.diff === sb.diff && sa.goalsFor === sb.goalsFor
    }
    let j = i + 1
    while (j < order.length && sameColumns(order[i], order[j])) j += 1

    if (j - i >= 2) {
      const tied = order.slice(i, j)
      const tiedSet = new Set(tied)
      const direct = matches.filter(
        (match) =>
          !!match.homeTeamId &&
          !!match.awayTeamId &&
          tiedSet.has(match.homeTeamId) &&
          tiedSet.has(match.awayTeamId),
      )
      const mini = tally(
        tied.map((id) => teams.find((team) => team.id === id)!),
        direct,
      )
      const sorted = [...tied].sort((a, b) => miniOrder(mini.get(a)!, mini.get(b)!))
      for (let k = 0; k + 1 < sorted.length; k += 1) {
        const sa = mini.get(sorted[k])!
        const sb = mini.get(sorted[k + 1])!
        if (sa.points === sb.points && sa.diff === sb.diff && sa.goalsFor === sb.goalsFor) {
          tieWarning = true
        }
      }
      order.splice(i, sorted.length, ...sorted)
    }
    i = j
  }

  const rows: StandingRow[] = order.map((id, index) => ({
    ...stats.get(id)!,
    position: index + 1,
  }))

  return { groupKey, rows, complete, tieWarning: complete && tieWarning }
}

function pendingSlot(label: string): Slot {
  return { kind: 'pending', label }
}

function teamSlot(teamId: string, name: string): Slot {
  return { kind: 'team', teamId, name }
}

/** Vaga da semifinal: só vira time de verdade com o grupo todo jogado. */
function qualifier(table: GroupTable, position: 1 | 2): Slot {
  const row = table.complete ? table.rows[position - 1] : undefined
  return row ? teamSlot(row.teamId, row.name) : pendingSlot(`${position}º do Grupo ${table.groupKey}`)
}

function resolveMatch(match: TournamentMatch, home: Slot, away: Slot): BracketMatch {
  let winner: 'home' | 'away' | null = null
  if (home.kind === 'team' && away.kind === 'team' && isPlayed(match)) {
    const hs = match.homeScore as number
    const as = match.awayScore as number
    if (hs > as) {
      winner = 'home'
    } else if (hs < as) {
      winner = 'away'
    } else if (match.homePens !== null && match.awayPens !== null) {
      if (match.homePens > match.awayPens) winner = 'home'
      else if (match.homePens < match.awayPens) winner = 'away'
    }
  }
  return { match, home, away, winner }
}

function winnerSlot(bracketMatch: BracketMatch): Slot | null {
  if (bracketMatch.winner === 'home' && bracketMatch.home.kind === 'team') return bracketMatch.home
  if (bracketMatch.winner === 'away' && bracketMatch.away.kind === 'team') return bracketMatch.away
  return null
}

function loserSlot(bracketMatch: BracketMatch): Slot | null {
  if (bracketMatch.winner === 'home' && bracketMatch.away.kind === 'team') return bracketMatch.away
  if (bracketMatch.winner === 'away' && bracketMatch.home.kind === 'team') return bracketMatch.home
  return null
}

function winnerOrPending(bracketMatch: BracketMatch | null, label: string): Slot {
  return (bracketMatch && winnerSlot(bracketMatch)) || pendingSlot(label)
}

function loserOrPending(bracketMatch: BracketMatch | null, label: string): Slot {
  return (bracketMatch && loserSlot(bracketMatch)) || pendingSlot(label)
}

export function buildView(tournament: Tournament): TournamentView {
  const tableA = computeGroupTable(tournament, 'A')
  const tableB = computeGroupTable(tournament, 'B')

  const byStage = (stage: TournamentStage): TournamentMatch[] =>
    tournament.matches
      .filter((match) => match.stage === stage)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))

  const semiMatches = byStage('semi')
  const sf1 = semiMatches[0]
    ? resolveMatch(semiMatches[0], qualifier(tableA, 1), qualifier(tableB, 2))
    : null
  const sf2 = semiMatches[1]
    ? resolveMatch(semiMatches[1], qualifier(tableA, 2), qualifier(tableB, 1))
    : null

  const finalMatch = byStage('final')[0]
  const final = finalMatch
    ? resolveMatch(
        finalMatch,
        winnerOrPending(sf1, 'Vencedor da Semi 1'),
        winnerOrPending(sf2, 'Vencedor da Semi 2'),
      )
    : null

  const thirdMatch = byStage('third')[0]
  const third = thirdMatch
    ? resolveMatch(
        thirdMatch,
        loserOrPending(sf1, 'Perdedor da Semi 1'),
        loserOrPending(sf2, 'Perdedor da Semi 2'),
      )
    : null

  return {
    tables: { A: tableA, B: tableB },
    semis: [sf1, sf2].filter((match): match is BracketMatch => match !== null),
    final,
    third,
    podium: {
      champion: final && final.winner ? winnerSlot(final) : null,
      runnerUp: final && final.winner ? loserSlot(final) : null,
      third: third && third.winner ? winnerSlot(third) : null,
      fourth: third && third.winner ? loserSlot(third) : null,
    },
  }
}

export function slotName(slot: Slot): string {
  return slot.kind === 'team' ? slot.name : slot.label
}
