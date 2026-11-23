import { Navigate, useNavigate } from 'react-router-dom'
import { AppShell, PageContainer } from '../components/Layout'
import { Button, Kicker } from '../components/ui'
import { useApp } from '../state/AppProvider'
import { formatDateTime, formatShortDeadline } from '../lib/deadline'

export function Success() {
  const { ballot, publicState } = useApp()
  const navigate = useNavigate()

  if (!ballot) return <Navigate to="/votar" replace />

  const shareText = encodeURIComponent(
    `Votação da 3ª Copa Clandestina de Futsal: dá tua nota para os jogadores. Fecha em ${
      publicState ? formatShortDeadline(publicState.closesAt) : 'breve'
    }. ${window.location.origin}${import.meta.env.BASE_URL}`,
  )

  return (
    <AppShell>
      <PageContainer className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="stamp grid h-32 w-32 place-items-center rounded-full border-2 border-gold bg-gold/10">
            <div className="flex flex-col items-center">
              <span className="display text-[34px] leading-none text-gold">OK</span>
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-gold">
                Registrado
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Kicker>Votos enviados</Kicker>
            <h1 className="display text-[40px] leading-none text-paper sm:text-[52px]">
              Valeu, {ballot.fullName.split(' ')[0]}
            </h1>
            <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-ash">
              Sua versão {ballot.revision} está registrada em {formatDateTime(ballot.updatedAt)}. Você
              pode voltar e mudar as notas até {publicState ? formatShortDeadline(publicState.closesAt) : 'o prazo final'}.
            </p>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-3">
            <Button size="lg" full variant="ghost" onClick={() => navigate('/votar')}>
              Editar meus votos
            </Button>
            <a
              href={`https://wa.me/?text=${shareText}`}
              target="_blank"
              rel="noreferrer"
              className="btn-press inline-flex h-14 w-full items-center justify-center rounded-full bg-gold px-8 text-[16px] font-semibold text-ink hover:bg-gold-deep"
            >
              Chamar a galera no WhatsApp
            </a>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  )
}
