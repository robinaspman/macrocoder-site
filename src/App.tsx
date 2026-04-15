import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Dashboard } from './components/Dashboard'
import { LiveTerminalDashboard } from './components/LiveTerminal/LiveTerminalDashboard'
import { AnalyticsProtected } from './components/Analytics/AnalyticsProtected'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LiveTerminalDashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics" element={<AnalyticsProtected />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
