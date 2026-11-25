import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import escudo from '../assets/escudo.png'
import { data } from '../lib/data'
import { cn } from '../lib/cn'

export function Crest({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('plate shrink-0 overflow-hidden rounded-[10px]', className)}
      style={{ width: size, height: size }}
    >
      <img
        src={escudo}
        alt="Escudo da Clandestina Futebol Clube"
        className="h-full w-full object-contain"
        style={{ padding: size * 0.06 }}
      />
    </span>
  )
}

export function DemoBadge({ className }: { className?: string }) {
  if (data.mode !== 'demo') return null
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md border border-gold/40 bg-gold/10 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold',
        className,
      )}
    >
      Modo demonstração
    </span>
  )
}

// As telas internas são um fragmento: header, main e footer caem direto no body
// (#root é display: contents), e o body é a coluna flex que segura a página.
export function AppShell({
  children,
  right,
  showHeader = true,
  subtitle = 'Votação oficial',
}: {
  children: ReactNode
  right?: ReactNode
  showHeader?: boolean
  subtitle?: string
}) {
  return (
    <>
      {showHeader ? (
        <header className="sticky top-0 z-30 border-b border-line bg-ink/88 backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <Crest size={38} />
              <span className="flex min-w-0 flex-col leading-none">
                <span className="display truncate text-[15px] tracking-wide text-paper">
                  3ª Copa Clandestina
                </span>
                <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.24em] text-ash sm:block">
                  {subtitle}
                </span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-3">{right}</div>
          </div>
        </header>
      ) : null}

      <main className="site-main">{children}</main>

      <footer className="border-t border-line px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 text-[12px] text-ash-600">
          <p className="text-ash">
            3ª Copa Clandestina de Futsal · 28/11 às 8h · Quadra Poliesportiva — IFBA
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/copa" className="transition-colors hover:text-paper">
              Tabela do campeonato
            </Link>
            <Link to="/regulamento" className="transition-colors hover:text-paper">
              Regulamento da votação
            </Link>
            <Link to="/privacidade" className="transition-colors hover:text-paper">
              Privacidade e dados
            </Link>
            <DemoBadge />
          </div>
        </div>
      </footer>
    </>
  )
}

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mx-auto w-full max-w-3xl px-4 sm:px-6', className)}>{children}</div>
  )
}
