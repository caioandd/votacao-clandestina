import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AppShell, PageContainer } from '../components/Layout'
import { Button, Kicker } from '../components/ui'
import { useApp } from '../state/AppProvider'
import { checkFullName, NAME_MAX } from '../lib/validation'
import { loadDraft, saveDraft } from '../hooks/useDraft'
import { formatShortDeadline } from '../lib/deadline'

export function Identify() {
  const { booting, session, emailAllowed, ballot, publicState, signOut } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (hydrated || !session) return
    const draft = loadDraft(session.id)
    setName(draft?.fullName || ballot?.fullName || session.displayName || '')
    setHydrated(true)
  }, [hydrated, session, ballot])

  if (booting) return null
  if (!session) return <Navigate to="/" replace />
  if (!emailAllowed) return <Navigate to="/restrito" replace />
  if (ballot) return <Navigate to="/votar" replace />

  const user = session

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const check = checkFullName(name)
    if (!check.ok) {
      setError(check.error)
      return
    }
    if (!consent) {
      setError('Confirme o uso dos dados para registrar o voto.')
      return
    }
    setError(null)
    saveDraft(user.id, {
      fullName: check.value,
      scores: loadDraft(user.id)?.scores ?? {},
      updatedAt: Date.now(),
    })
    navigate('/votar')
  }

  return (
    <AppShell
      right={
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            void signOut()
          }}
        >
          Sair
        </Button>
      }
    >
      <PageContainer className="flex flex-1 flex-col justify-center py-10">
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-3">
            <Kicker>Passo 1 de 2</Kicker>
            <h1 className="display text-[38px] leading-none text-paper sm:text-[46px]">
              Quem está votando?
            </h1>
            <p className="max-w-md text-[15px] leading-relaxed text-ash">
              Seu nome completo aparece só para a organização, para conferir que cada pessoa votou
              uma vez. No resultado, os votos são anônimos.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-11 w-11 rounded-full border border-line-2"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-[15px] font-semibold text-ash">
                {user.displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-paper">{user.displayName}</p>
              <p className="truncate text-[13px] text-ash-600">{user.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-2">
              <span className="text-[12px] font-semibold uppercase tracking-[0.24em] text-ash">
                Nome completo
              </span>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setError(null)
                }}
                maxLength={NAME_MAX}
                autoComplete="name"
                placeholder="Ex.: Caio Andrade"
                className="h-14 rounded-[var(--radius-card)] border border-line bg-surface px-4 text-[16px] text-paper placeholder:text-ash-600 focus:border-gold"
              />
            </label>

            <label className="flex items-start gap-3 text-[13px] leading-relaxed text-ash">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => {
                  setConsent(event.target.checked)
                  setError(null)
                }}
                className="mt-0.5 h-5 w-5 shrink-0 accent-gold"
              />
              <span>
                Autorizo o uso do meu e-mail institucional e do meu nome para registro e auditoria
                desta votação, conforme a{' '}
                <Link
                  to="/privacidade"
                  className="text-paper underline decoration-line-2 underline-offset-4"
                >
                  política de privacidade
                </Link>
                .
              </span>
            </label>

            {error ? <p className="text-[13px] font-medium text-crimson">{error}</p> : null}

            <Button type="submit" size="lg" full>
              Começar votação
            </Button>

            {publicState ? (
              <p className="text-center text-[12px] text-ash-600">
                Você pode editar seus votos até {formatShortDeadline(publicState.closesAt)}.
              </p>
            ) : null}
          </form>
        </div>
      </PageContainer>
    </AppShell>
  )
}
