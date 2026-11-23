import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell, PageContainer } from '../components/Layout'
import { Button, Kicker } from '../components/ui'
import { useApp } from '../state/AppProvider'
import { checkFullName, NAME_MAX } from '../lib/validation'
import { formatShortDeadline } from '../lib/deadline'

export function Identify() {
  const { booting, publicState, voterName, identify, forgetVoter } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (hydrated || booting) return
    setName(voterName ?? '')
    setHydrated(true)
  }, [hydrated, booting, voterName])

  if (booting) return null

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
    setBusy(true)
    void identify(check.value).then(() => navigate('/votar'))
  }

  async function handleSwitch() {
    const ok = window.confirm(
      'Trocar de pessoa neste aparelho? Quem já votou aqui continua registrado, mas não poderá mais editar os votos por este aparelho.',
    )
    if (!ok) return
    await forgetVoter()
    setName('')
    setConsent(false)
    setError(null)
  }

  return (
    <AppShell>
      <PageContainer className="flex flex-1 flex-col justify-center py-10">
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-3">
            <Kicker>Passo 1 de 2</Kicker>
            <h1 className="display text-[38px] leading-none text-paper sm:text-[46px]">
              Quem está votando?
            </h1>
            <p className="max-w-md text-[15px] leading-relaxed text-ash">
              Escreva seu nome completo. Ele fica salvo apenas neste aparelho, para você continuar
              de onde parou — e a organização usa para conferir a votação. No resultado, os votos
              são anônimos.
            </p>
          </div>

          {voterName ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
              <p className="text-[13px] text-ash">
                Este aparelho já está identificado como{' '}
                <strong className="font-semibold text-paper">{voterName}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  void handleSwitch()
                }}
                className="text-[13px] text-ash-600 underline decoration-line-2 underline-offset-4 transition-colors hover:text-paper"
              >
                Trocar de pessoa
              </button>
            </div>
          ) : null}

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
                Autorizo o registro do meu nome e das minhas notas para a organização conferir esta
                votação, conforme a{' '}
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

            <Button type="submit" size="lg" full disabled={busy}>
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
