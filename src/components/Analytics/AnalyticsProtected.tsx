import { useState, useEffect } from 'react'
import { AnalyticsLogin } from './AnalyticsLogin'
import { AnalyticsPage } from './AnalyticsPage'

export function AnalyticsProtected() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if already authenticated in this session
    const auth = sessionStorage.getItem('analytics_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (success: boolean) => {
    setIsAuthenticated(success)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('analytics_auth')
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1214] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e0a040] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AnalyticsLogin onLogin={handleLogin} />
  }

  return <AnalyticsPage onLogout={handleLogout} />
}
