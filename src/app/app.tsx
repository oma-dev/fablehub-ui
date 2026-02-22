import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import Layout from './Layout'
import Homepage from './routes/Homepage'
import Login from './routes/Auth/Login'
import Register from './routes/Auth/Register'
import Fables from './routes/Fables/List'
import Fable from './routes/Fables/Detail'
import FableCreate from './routes/Fables/Create'
import FableIdleRPG from './routes/Fables/expressions/IdleRPG/Play'
import IdleRpgCreate from './routes/Fables/expressions/IdleRPG/Create'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Homepage />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="fables" element={<Fables />} />
            <Route path="fables/create" element={<FableCreate />} />
            <Route path="fables/:fableId" element={<Fable />} />
            <Route path="fables/:fableId/idle-rpg/create" element={<IdleRpgCreate />} />
            <Route path="fables/:fableId/idle-rpg" element={<FableIdleRPG />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
