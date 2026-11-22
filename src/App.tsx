import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
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
import { RequireAuth } from './routes/guards'

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/restrito" element={<Restricted />} />
          <Route path="/regulamento" element={<Regulamento />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/entrar" element={<RequireAuth><Identify /></RequireAuth>} />
          <Route path="/votar" element={<RequireAuth><Vote /></RequireAuth>} />
          <Route path="/revisar" element={<RequireAuth><Review /></RequireAuth>} />
          <Route path="/enviado" element={<RequireAuth><Success /></RequireAuth>} />
          <Route path="/encerrada" element={<RequireAuth><Closed /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
