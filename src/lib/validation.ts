/** Regras de validação espelhadas no banco (a RPC rejeita as mesmas entradas). */

export const NAME_MIN = 5
export const NAME_MAX = 60

export type NameCheck = { ok: true; value: string } | { ok: false; error: string }

export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

export function checkFullName(raw: string): NameCheck {
  const value = normalizeName(raw)
  if (value.length < NAME_MIN) return { ok: false, error: 'Escreva nome e sobrenome.' }
  if (value.length > NAME_MAX) return { ok: false, error: `Máximo de ${NAME_MAX} caracteres.` }
  if (/\d/.test(value)) return { ok: false, error: 'O nome não pode conter números.' }
  if (!/^[\p{L}][\p{L}'’.\- ]*[\p{L}]$/u.test(value)) {
    return { ok: false, error: 'Use apenas letras, espaços, hífen e apóstrofo.' }
  }
  if (value.split(' ').length < 2) return { ok: false, error: 'Informe nome e sobrenome.' }
  return { ok: true, value }
}

export const SCORES = [1, 2, 3, 4, 5] as const
export type ScoreValue = (typeof SCORES)[number]

export function isValidScore(value: unknown): value is ScoreValue | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5)
}

export function isAnswered(value: number | null | undefined): boolean {
  // `null` é resposta válida ("não sei"); `undefined` é pergunta em aberto.
  return value === null || (typeof value === 'number' && value >= 1 && value <= 5)
}

export function missingCount(
  players: { id: string }[],
  scores: Record<string, number | null>,
): number {
  return players.reduce((acc, p) => (isAnswered(scores[p.id]) ? acc : acc + 1), 0)
}

export function answeredCount(
  players: { id: string }[],
  scores: Record<string, number | null>,
): number {
  return players.length - missingCount(players, scores)
}
