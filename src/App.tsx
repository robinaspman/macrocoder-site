import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { HomePage } from './components/HomePage'
import { ResultsPage } from './components/ResultsPage'
import { initSecurity } from './lib/security'
import './index.css'

function App() {
  useEffect(() => {
    return initSecurity()
  }, [])

  return (
    <BrowserRouter basename="/macrocoder-site">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
