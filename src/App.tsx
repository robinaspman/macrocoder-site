import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './components/HomePage'
import { ResultsPage } from './components/ResultsPage'
import './index.css'

function App() {
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
