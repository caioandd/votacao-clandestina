import type { Phase, PublicState } from './types'

/** Fuso oficial da organização (America/Bahia, UTC-3). */
export const TZ = 'America/Bahia'

export function createPublicState(overrides?: Partial<PublicState>): PublicState {
  return {
    opensAt: '2026-11-22T00:00:00-03:00',
    closesAt: '2026-11-25T23:59:00-03:00',
    playerCount: 29,
    resultsPublic: false,
    ...overrides,
  }
}

export function phaseOf(state: PublicState, now = new Date()): Phase {
  const opens = new Date(state.opensAt).getTime()
  const closes = new Date(state.closesAt).getTime()
  const t = now.getTime()
  if (t < opens) return 'before'
  if (t >= closes) return 'closed'
  return 'open'
}

export type Countdown = {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
}

export function countdownTo(iso: string, now = new Date()): Countdown {
  const totalMs = Math.max(0, new Date(iso).getTime() - now.getTime())
  const totalSeconds = Math.floor(totalMs / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  }
}

export function formatCountdown(c: Countdown): string {
  if (c.days > 0) return `${c.days}d ${String(c.hours).padStart(2, '0')}h`
  if (c.hours > 0) return `${c.hours}h ${String(c.minutes).padStart(2, '0')}m`
  return `${c.minutes}m ${String(c.seconds).padStart(2, '0')}s`
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatShortDeadline(iso: string): string {
  const d = new Date(iso)
  const day = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit' }).format(d)
  const month = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, month: '2-digit' }).format(d)
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return `${day}/${month} às ${time}`
}

/** Valor para <input type="datetime-local"> no fuso da organização. */
export function toLocalInputValue(iso: string): string {
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
  return formatted.replace(' ', 'T')
}

/** Converte o valor do input (America/Bahia, UTC-3) para ISO com offset. */
export function fromLocalInputValue(value: string): string {
  return `${value}:00-03:00`
}
