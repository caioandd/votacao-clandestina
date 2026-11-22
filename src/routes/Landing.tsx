import { Link, useNavigate } from 'react-router-dom'
import escudo from '../assets/escudo.png'
import { Button, Kicker } from '../components/ui'
import { AppShell } from '../components/Layout'
import { useApp } from '../state/AppProvider'
import { useNow } from '../hooks/useNow'
import { countdownTo, formatCountdown, formatShortDeadline } from '../lib/deadline'
import { chromeIntentUrl, isAndroid, isInAppBrowser } from '../lib/browser'
import { data } from '../lib/data'

export function Landing() {
  const { session, emailAllowed, publicState, ballot, phase, signIn, loadError } = useApp()
  const now = useNow(1000)
  const navigate = useNavigate()

  const closesAt = publicState?.closesAt ?? ''
  const countdown = closesAt ? countdownTo(closesAt, now) : null
  const closed = phase === 'closed'

  async function handlePrimary() {
    if (session && emailAllowed) {
      navigate(ballot ? '/votar' : '/entrar')
      return
    }
    await signIn()
    // No Supabase isto redireciona para o Google e a linha abaixo não roda.
    // No modo demonstração a sessão é criada na hora, então seguimos o fluxo.
    const user = await data.getSession()
    if (user) navigate('/entrar')
  }

  const primaryLabel = session && emailAllowed
    ? ballot
      ? 'Editar meus votos'
      : 'Continuar para a votação'
    : 'Entrar com Google'

  return (
    <AppShell showHeader={false}>
      {/* Placa do escudo — mesma composição do banner */}
      <section className="plate enter-plate w-full border-b-[14px] border-gold">
        <div className="flex h-[clamp(240px,36vh,380px)] w-full items-center justify-center">
          <img
            src={escudo}
            alt="Escudo da Clandestina Futebol Clube"
            className="h-[78%] w-auto max-w-[78%] object-contain"
          />
        </div>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-10 text-center sm:gap-6">
        <Kicker className="enter-rise">Votação oficial</Kicker>

        <h1 className="enter-mask display text-[clamp(40px,11vw,76px)] text-paper">
          3ª Copa Clandestina
          <span className="mt-1 block text-gold">de Futsal</span>
        </h1>

        <hr className="rule enter-rise max-w-xs" />

        <p className="enter-rise max-w-md text-[15px] leading-relaxed text-ash">
          Dê uma nota de <strong className="font-semibold text-paper">1 a 5 estrelas</strong> para
          cada jogador. A organização usa as notas para montar os{' '}
          <strong className="font-semibold text-paper">6 times</strong> equilibrados da copa.
        </p>

        <ul className="enter-rise flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-ash">
          <li>{publicState?.playerCount ?? 29} jogadores</li>
          <li className="text-line-2" aria-hidden="true">
            ·
          </li>
          <li>6 times</li>
          <li className="text-line-2" aria-hidden="true">
            ·
          </li>
          <li>1 voto por conta</li>
        </ul>

        {countdown ? (
          <div className="enter-rise flex items-center justify-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ash">
              {closed ? 'Encerrada' : 'Fecha em'}
            </span>
            <span className="display tnum text-[30px] leading-none text-paper sm:text-[36px]">
              {closed ? '00h 00m' : formatCountdown(countdown)}
            </span>
          </div>
        ) : null}

        <div className="enter-rise flex w-full max-w-sm flex-col items-center gap-3 pt-1">
          <Button size="lg" full onClick={handlePrimary} disabled={closed && !ballot}>
            {closed && !ballot ? 'Votação encerrada' : primaryLabel}
          </Button>
          <p className="text-[12px] leading-relaxed text-ash-600">
            Acesso restrito ao e-mail institucional <strong className="text-ash">@ifba.edu.br</strong>
            {closesAt
              ? closed
                ? ` · encerrada em ${formatShortDeadline(closesAt)}`
                : ` · pode editar até ${formatShortDeadline(closesAt)}`
              : null}
          </p>
        </div>

        {isInAppBrowser() ? (
          <div className="enter-rise w-full max-w-sm rounded-[var(--radius-card)] border border-gold/40 bg-gold/8 p-4 text-left">
            <p className="text-[13px] font-semibold text-gold">Abra fora do WhatsApp</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ash">
              O login do Google não funciona no navegador interno do WhatsApp.{' '}
              {isAndroid() ? 'Toque para abrir no Chrome:' : 'Toque em ⋯ e escolha “Abrir no Safari”.'}
            </p>
            {isAndroid() ? (
              <a
                href={chromeIntentUrl()}
                className="mt-3 inline-flex h-10 items-center rounded-full bg-gold px-5 text-[13px] font-semibold text-ink"
              >
                Abrir no Chrome
              </a>
            ) : null}
          </div>
        ) : null}

        {loadError ? (
          <p className="max-w-sm text-[13px] text-crimson">{loadError}</p>
        ) : null}

        <div className="enter-rise mt-2 flex flex-col items-center gap-2 text-[13px]">
          <Link to="/regulamento" className="text-ash underline decoration-line-2 underline-offset-4 transition-colors hover:text-paper">
            Como funciona a votação
          </Link>
        </div>
      </section>

      <div className="pb-10 text-center text-[12px] text-ash-600">
        {data.mode === 'demo' ? 'Modo demonstração · dados apenas neste navegador' : null}
      </div>
    </AppShell>
  )
}
