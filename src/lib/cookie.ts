/**
 * Identidade de quem vota, guardada em cookie (sem login).
 *
 * O cookie `cd_voter_v1` guarda um JSON `{ id, name }`:
 *   - `id`   — identificador aleatório do aparelho (UUID). É a chave da cédula
 *              no banco: com ele o votante reabre e edita a própria cédula.
 *   - `name` — nome completo digitado na entrada, para pré-preencher as
 *              próximas visitas.
 *
 * Validade de 1 ano; o caminho é `/` para funcionar tanto no site publicado
 * (`/votacao-clandestina/`) quanto no servidor local. `Secure` só em https
 * (localhost precisa continuar aceitando o cookie para o QA e o dev).
 */

export type VoterCookie = {
  id: string
  name: string
}

const COOKIE_NAME = 'cd_voter_v1'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export function readVoter(): VoterCookie | null {
  try {
    const prefix = `${COOKIE_NAME}=`
    const part = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(prefix))
    if (!part) return null
    const parsed = JSON.parse(decodeURIComponent(part.slice(prefix.length))) as VoterCookie
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.id !== 'string' || !parsed.id) return null
    if (typeof parsed.name !== 'string') return null
    return { id: parsed.id, name: parsed.name }
  } catch {
    return null
  }
}

export function saveVoter(voter: VoterCookie) {
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    const value = encodeURIComponent(JSON.stringify(voter))
    document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`
  } catch {
    // sem cookie: a sessão desta visita continua valendo em memória
  }
}

export function clearVoter() {
  try {
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`
  } catch {
    // nada a limpar
  }
}

export function newVoterId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // segue para o plano B
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}
