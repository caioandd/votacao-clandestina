/**
 * Gerador de times equilibrados.
 *
 * Regra da organização: 6 times, só jogadores de linha, sem posição.
 * O objetivo é deixar a distribuição de notas o mais homogênea possível entre
 * as equipes — não só a soma parecida, mas as médias próximas.
 *
 * Método: snake draft na ordem de nota + busca local determinística que troca
 * jogadores entre times enquanto a troca reduzir o desequilíbrio.
 */

export type TeamPlayer = {
  id: string
  name: string
  score: number
  isGoalkeeper: boolean
}

export type Team = {
  name: string
  players: TeamPlayer[]
  sum: number
  mean: number
  median: number
}

export type GenerateOptions = {
  teamCount?: number
  locked?: Record<string, string> // playerId -> nome do time
  seed?: number
  iterations?: number
}

export type GenerateResult = {
  teams: Team[]
  delta: number // diferença entre a maior e a menor média
  spread: number // desvio médio das médias
}

const ROUND = 1e6

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function buildTeams(names: string[], assignments: TeamPlayer[][]): Team[] {
  return names.map((name, i) => {
    const players = assignments[i]
    const scores = players.map((p) => p.score)
    const sum = scores.reduce((a, b) => a + b, 0)
    return {
      name,
      players,
      sum: Math.round(sum * 100) / 100,
      mean: players.length ? Math.round((sum / players.length) * 1000) / 1000 : 0,
      median: Math.round(median(scores) * 1000) / 1000,
    }
  })
}

export function teamStats(teams: Team[]) {
  const means = teams.map((t) => t.mean)
  const global = means.reduce((a, b) => a + b, 0) / (means.length || 1)
  const delta = Math.max(...means) - Math.min(...means)
  const spread = means.reduce((acc, m) => acc + Math.abs(m - global), 0) / (means.length || 1)
  return { global, delta, spread }
}

/** Função-objetivo: menor é melhor. Penaliza médias distantes e tamanhos desiguais. */
function cost(assignments: TeamPlayer[][], targetSize: number): number {
  const means = assignments.map((team) => {
    if (!team.length) return 0
    return team.reduce((acc, p) => acc + p.score, 0) / team.length
  })
  const global = means.reduce((a, b) => a + b, 0) / (means.length || 1)
  const delta = Math.max(...means) - Math.min(...means)
  const spread = means.reduce((acc, m) => acc + Math.abs(m - global), 0) / (means.length || 1)
  const sizePenalty =
    assignments.reduce((acc, team) => acc + Math.abs(team.length - targetSize), 0) /
    (assignments.length || 1)
  return delta * 0.6 + spread * 0.4 + sizePenalty * 0.5
}

export function generateTeams(players: TeamPlayer[], options: GenerateOptions = {}): GenerateResult {
  const teamCount = options.teamCount ?? 6
  const seed = options.seed ?? 20261128
  const iterations = options.iterations ?? 4000
  const names = Array.from({ length: teamCount }, (_, i) => `Time ${i + 1}`)

  const pool = players.filter((p) => !p.isGoalkeeper)
  const locked = options.locked ?? {}
  const random = mulberry32(seed)

  // capacidade base (algumas equipes ficam com 1 a mais quando não é divisível)
  const targetSize = Math.ceil(pool.length / teamCount)

  const assignments: TeamPlayer[][] = names.map(() => [])
  const free: TeamPlayer[] = []

  for (const player of pool) {
    const lockedTeam = locked[player.id]
    const index = names.indexOf(lockedTeam)
    if (index >= 0 && assignments[index].length < targetSize) {
      assignments[index].push(player)
    } else {
      free.push(player)
    }
  }

  const ranked = [...free].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'pt-BR'))

  // 1. snake draft: 1→6, 6→1, 1→6 ...
  let cursor = 0
  let direction = 1
  for (const player of ranked) {
    let placed = false
    for (let step = 0; step < teamCount * 2 && !placed; step += 1) {
      const index = Math.min(Math.max(cursor, 0), teamCount - 1)
      const notLocked = !locked[player.id]
      if (notLocked && assignments[index].length < targetSize) {
        assignments[index].push(player)
        placed = true
        cursor += direction
        if (cursor > teamCount - 1 || cursor < 0) {
          direction *= -1
          cursor += direction
        }
        if (cursor > teamCount - 1) cursor = teamCount - 1
        if (cursor < 0) cursor = 0
      } else {
        cursor += direction
        if (cursor > teamCount - 1 || cursor < 0) {
          direction *= -1
          cursor += direction
        }
      }
    }
    if (!placed) {
      // fallback: menor time
      const index = assignments.reduce(
        (best, team, i) => (team.length < assignments[best].length ? i : best),
        0,
      )
      assignments[index].push(player)
    }
  }

  // 2. busca local
  let best = cost(assignments, targetSize)
  const movable = (team: TeamPlayer[]) => team.filter((p) => !locked[p.id])

  for (let i = 0; i < iterations; i += 1) {
    const a = Math.floor(random() * teamCount)
    let b = Math.floor(random() * teamCount)
    if (a === b) b = (b + 1) % teamCount

    const listA = movable(assignments[a])
    const listB = movable(assignments[b])
    if (!listA.length || !listB.length) continue

    const pa = listA[Math.floor(random() * listA.length)]
    const pb = listB[Math.floor(random() * listB.length)]

    // troca
    assignments[a][assignments[a].indexOf(pa)] = pb
    assignments[b][assignments[b].indexOf(pb)] = pa

    const candidate = cost(assignments, targetSize)
    if (candidate <= best) {
      best = candidate
    } else {
      // desfaz
      assignments[a][assignments[a].indexOf(pb)] = pa
      assignments[b][assignments[b].indexOf(pa)] = pb
    }
  }

  const teams = buildTeams(names, assignments)
  const stats = teamStats(teams)
  return {
    teams: teams.map((t) => ({ ...t, mean: Math.round(t.mean * ROUND) / ROUND })),
    delta: Math.round(stats.delta * 1000) / 1000,
    spread: Math.round(stats.spread * 1000) / 1000,
  }
}

export function exportTeamsText(teams: Team[]): string {
  const lines: string[] = ['*3ª COPA CLANDESTINA · TIMES*', '']
  for (const team of teams) {
    lines.push(`*${team.name.toUpperCase()}* — média ${team.mean.toFixed(2)}`)
    for (const player of team.players) lines.push(`• ${player.name}`)
    lines.push('')
  }
  return lines.join('\n').trim()
}

/** Troca dois jogadores de times diferentes e recalcula as estatísticas. */
export function swapPlayers(
  teams: Team[],
  a: { teamIndex: number; playerId: string },
  b: { teamIndex: number; playerId: string },
): Team[] {
  if (a.teamIndex === b.teamIndex) {
    if (a.playerId === b.playerId) return teams
    return teams.map((team, index) => {
      if (index !== a.teamIndex) return team
      const players = [...team.players]
      const from = players.findIndex((p) => p.id === a.playerId)
      const to = players.findIndex((p) => p.id === b.playerId)
      if (from < 0 || to < 0) return team
      const [moved] = players.splice(from, 1)
      players.splice(to, 0, moved)
      return { ...team, players }
    })
  }

  const next = teams.map((team) => ({ ...team, players: [...team.players] }))
  const teamA = next[a.teamIndex]
  const teamB = next[b.teamIndex]
  const indexA = teamA.players.findIndex((p) => p.id === a.playerId)
  const indexB = teamB.players.findIndex((p) => p.id === b.playerId)
  if (indexA < 0 || indexB < 0) return teams

  const playerA = teamA.players[indexA]
  const playerB = teamB.players[indexB]
  teamA.players[indexA] = playerB
  teamB.players[indexB] = playerA

  return next.map((team) => {
    const scores = team.players.map((p) => p.score)
    const sum = scores.reduce((x, y) => x + y, 0)
    return {
      ...team,
      sum: Math.round(sum * 100) / 100,
      mean: team.players.length ? Math.round((sum / team.players.length) * 1000) / 1000 : 0,
      median: Math.round(median(scores) * 1000) / 1000,
    }
  })
}

export function exportTeamsCsv(teams: Team[]): string {
  const lines = ['time,media,soma,jogador,nota']
  for (const team of teams) {
    for (const player of team.players) {
      lines.push(
        [
          team.name,
          team.mean.toFixed(3),
          team.sum.toFixed(2),
          `"${player.name}"`,
          player.score.toFixed(3),
        ].join(','),
      )
    }
  }
  return lines.join('\n')
}
