export type Draft = {
  fullName: string
  scores: Record<string, number | null>
  updatedAt: number
}

const key = (userId: string) => `cd_draft_v1_${userId}`

export function loadDraft(userId: string): Draft | null {
  try {
    const raw = localStorage.getItem(key(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Draft
    if (!parsed || typeof parsed !== 'object' || !parsed.scores) return null
    return parsed
  } catch {
    return null
  }
}

export function saveDraft(userId: string, draft: Draft) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(draft))
  } catch {
    // sem espaço no dispositivo: segue sem rascunho
  }
}

export function clearDraft(userId: string) {
  localStorage.removeItem(key(userId))
}
