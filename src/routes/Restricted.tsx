import { Link } from 'react-router-dom'
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
          O login com o Google é usado apenas pela organização, para abrir o painel da votação.
          Esta conta não tem essa permissão.
        </p>
        <p className="mx-auto max-w-sm text-[14px] leading-relaxed text-ash-600">
          Para votar não é preciso login: volte ao início e escreva seu nome completo.
        </p>
        {session ? (
          <p className="text-[13px] text-ash-600">
            Conta atual: <span className="text-ash">{session.email}</span>
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={() => {
            void signOut()
          }}
        >
          Trocar de conta
        </Button>
        <Link
          to="/"
          className="text-[13px] text-ash-600 underline decoration-line-2 underline-offset-4 transition-colors hover:text-paper"
        >
          Ir para a votação
        </Link>
      </div>
    </div>
  )
}
