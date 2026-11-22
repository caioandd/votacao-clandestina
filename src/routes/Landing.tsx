import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import escudo from '../assets/escudo.png'
import { DemoBadge } from '../components/Layout'
import { useApp } from '../state/AppProvider'
import { useNow } from '../hooks/useNow'
import { countdownTo, formatCountdown, formatShortDeadline } from '../lib/deadline'
import { chromeIntentUrl, isAndroid, isInAppBrowser } from '../lib/browser'
import { data } from '../lib/data'

/**
 * Monta o momento da seção (counter-rolls, momentos do kit): os algarismos dos
 * números rolam uma vez quando a seção entra na tela. Sem script (ou com pouca
 * animação) o número fica como está escrito no HTML — o momento é enfeite.
 */
function useMoment(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let live = true
    void (async () => {
      try {
        const mod = (await import(
          /* @vite-ignore */ `${import.meta.env.BASE_URL}moments/moments.js`
        )) as { mount?: (el: Element) => Promise<unknown> }
        if (live && mod.mount) await mod.mount(el)
      } catch {
        // sem momento: os números já estão escritos na página
      }
    })()
    return () => {
      live = false
    }
  }, [ref])
}

export function Landing() {
  const { session, emailAllowed, publicState, ballot, phase, signIn, loadError } = useApp()
  const now = useNow(1000)
  const navigate = useNavigate()
  const comoRef = useRef<HTMLElement | null>(null)
  useMoment(comoRef)

  const closesAt = publicState?.closesAt ?? ''
  const playerCount = publicState?.playerCount ?? 29
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
  const primaryButtonLabel = closed && !ballot ? 'Votação encerrada' : primaryLabel

  return (
    <main className="landing">
      <section className="hero" data-enter>
        <div className="wrap">
          <div className="hero-text hero-split">
            <div className="hero-copy">
              <p className="hero__kicker">
                <span className="dot" aria-hidden="true" />
                Votação oficial · 28/11 às 8h · IFBA
              </p>

              <h1 className="display">3ª Copa Clandestina de Futsal</h1>

              <p className="hero__lead">
                Dê uma nota de <strong>1 a 5 estrelas</strong> para cada jogador. A organização usa
                as notas para montar os <strong>6 times</strong> equilibrados da copa.
              </p>

              {countdown ? (
                <p className="hero-timer">
                  <span>{closed ? 'Encerrada' : 'Fecha em'}</span>
                  <b>{closed ? '00h 00m' : formatCountdown(countdown)}</b>
                </p>
              ) : null}

              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handlePrimary}
                  disabled={closed && !ballot}
                >
                  {primaryButtonLabel}
                </button>
                <a className="btn btn--secondary" href="#como-funciona">
                  Como funciona
                </a>
              </div>

              <p className="hero-note">
                Acesso restrito ao e-mail institucional <strong>@ifba.edu.br</strong>
                {closesAt
                  ? closed
                    ? ` · encerrada em ${formatShortDeadline(closesAt)}`
                    : ` · edite até ${formatShortDeadline(closesAt)}`
                  : null}
                {data.mode === 'demo' ? (
                  <>
                    {' '}
                    <DemoBadge className="align-middle" />
                  </>
                ) : null}
              </p>

              {isInAppBrowser() ? (
                <div className="hero-alert">
                  <p className="hero-alert__title">Abra fora do WhatsApp</p>
                  <p>
                    O login do Google não funciona no navegador interno do WhatsApp.{' '}
                    {isAndroid()
                      ? 'Toque para abrir no Chrome:'
                      : 'Toque em ⋯ e escolha “Abrir no Safari”.'}
                  </p>
                  {isAndroid() ? (
                    <a className="btn btn--primary" href={chromeIntentUrl()}>
                      Abrir no Chrome
                    </a>
                  ) : null}
                </div>
              ) : null}

              {loadError ? (
                <p className="hero-note" style={{ color: 'var(--color-crimson)' }}>
                  {loadError}
                </p>
              ) : null}

              <dl className="hero-facts">
                <div>
                  <dt>Jogadores</dt>
                  <dd>{playerCount}</dd>
                </div>
                <div>
                  <dt>Times</dt>
                  <dd>6</dd>
                </div>
                <div>
                  <dt>Cédula</dt>
                  <dd>1 por conta</dd>
                </div>
              </dl>
            </div>

            <div className="hero-visual">
              <div className="plate">
                <img src={escudo} alt="Escudo da Clandestina Futebol Clube" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="como-funciona"
        ref={comoRef}
        className="como"
        data-moment="counter-rolls"
        aria-label="Como funciona a votação"
      >
        <div className="wrap">
          <div className="section-head">
            <h2 className="display">Como funciona</h2>
            <p>
              Uma cédula por conta IFBA: dê as notas, a organização soma tudo e volta com os 6
              times equilibrados. O resultado é só da organização — nunca é público.
            </p>
          </div>

          <ol className="steps grid">
            <li className="span-4">
              <p className="step-num">1</p>
              <h3>Entre com o IFBA</h3>
              <p>
                Login com o Google institucional. Só e-mails <strong>@ifba.edu.br</strong> podem
                votar, e cada conta tem uma cédula.
              </p>
            </li>
            <li className="span-4">
              <p className="step-num">2</p>
              <h3>Dê as notas</h3>
              <p>
                De <strong>1 a 5 estrelas</strong> para cada jogador — ou “Não sei” para quem você
                não conhece. Dá para editar até o prazo.
              </p>
            </li>
            <li className="span-4">
              <p className="step-num">3</p>
              <h3>A organização equilibra</h3>
              <p>
                As notas viram um ranking interno, e os <strong>6 times</strong> saem equilibrados
                por posição, em snake draft.
              </p>
            </li>
          </ol>

          <dl className="stats">
            <div>
              <dt>jogadores na lista</dt>
              <dd className="t-stat">{playerCount}</dd>
            </div>
            <div>
              <dt>times equilibrados</dt>
              <dd className="t-stat">6</dd>
            </div>
            <div>
              <dt>cédula por conta, editável</dt>
              <dd className="t-stat">1</dd>
            </div>
          </dl>

          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handlePrimary}
              disabled={closed && !ballot}
            >
              {primaryButtonLabel}
            </button>
            <Link className="btn btn--secondary" to="/regulamento">
              Regulamento
            </Link>
            <Link className="link-under" to="/privacidade">
              Privacidade e dados
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
