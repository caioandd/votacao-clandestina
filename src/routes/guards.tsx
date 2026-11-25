import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Crest } from '../components/Layout'
import { Spinner } from '../components/ui'
import { useApp } from '../state/AppProvider'

export function Splash({ label = 'Carregando' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ink">
      <Crest size={72} />
      <Spinner label={label} />
    </div>
  )
}

export function RequireVoter({ children }: { children: ReactNode }) {
  const { booting, voterId, phase } = useApp()
  if (booting) return <Splash />
  if (!voterId) return <Navigate to="/entrar" replace />
  // Prazo encerrado: votar, revisar e editar saem do ar; só a tela de
  // encerramento (com o aviso de resultados) fica acessível.
  if (phase === 'closed') return <Navigate to="/encerrada" replace />
  return <>{children}</>
}
