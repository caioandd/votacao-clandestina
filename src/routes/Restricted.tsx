import { Crest } from '../components/Layout'
import { Button } from '../components/ui'
import { useApp } from '../state/AppProvider'

export function Restricted() {
  const { session, signOut } = useApp()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-ink px-6 text-center">
      <Crest size={80} />
      <div className="flex flex-col gap-3">
        <h1 className="display text-[34px] leading-none text-paper sm:text-[42px]">
          Acesso restrito
        </h1>
        <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-ash">
          Esta votação é exclusiva para o e-mail institucional{' '}
          <strong className="font-semibold text-paper">@ifba.edu.br</strong>. Entre com a sua conta
          institucional do Google.
        </p>
        {session ? (
          <p className="text-[13px] text-ash-600">
            Conta atual: <span className="text-ash">{session.email}</span>
          </p>
        ) : null}
      </div>
      <Button
        onClick={() => {
          void signOut()
        }}
      >
        Trocar de conta
      </Button>
    </div>
  )
}
