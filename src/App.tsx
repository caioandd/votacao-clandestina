import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './state/AppProvider'
import { Landing } from './routes/Landing'
import { Identify } from './routes/Identify'
import { Vote } from './routes/Vote'
import { Review } from './routes/Review'
import { Success } from './routes/Success'
import { Closed } from './routes/Closed'
import { Restricted } from './routes/Restricted'
import { Admin } from './routes/Admin'
import { Privacidade, Regulamento } from './routes/Static'
import { RequireVoter } from './routes/guards'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/restrito" element={<Restricted />} />
          <Route path="/regulamento" element={<Regulamento />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/entrar" element={<Identify />} />
          <Route path="/votar" element={<RequireVoter><Vote /></RequireVoter>} />
          <Route path="/revisar" element={<RequireVoter><Review /></RequireVoter>} />
          <Route path="/enviado" element={<RequireVoter><Success /></RequireVoter>} />
          <Route path="/encerrada" element={<Closed />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
