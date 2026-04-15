import { useState } from 'react'
import { Shield, Lock, Eye, EyeOff } from 'lucide-react'

interface AnalyticsLoginProps {
  onLogin: (success: boolean) => void
}

export function AnalyticsLogin({ onLogin }: AnalyticsLoginProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Simple password check - in production, this would be server-side
  const VALID_PASSWORD = 'macro2026'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (password === VALID_PASSWORD) {
      sessionStorage.setItem('analytics_auth', 'true')
      onLogin(true)
    } else {
      setError('Invalid password. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1214] text-[#d0dede] [font-family:Inter,ui-sans-serif,system-ui,sans-serif] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#111c1e] border border-[#1e2e2e] mb-4">
            <Shield className="h-8 w-8 text-[#e0a040]" />
          </div>
          <h1 className="text-2xl font-bold text-[#ece7e2] tracking-tight">Ruler Analytics</h1>
          <p className="text-[#5a7a7a] text-sm mt-2">
            Enter password to access analytics dashboard
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#111c1e] border border-[#1e2e2e] rounded-lg p-6"
        >
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-2"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-[#3a5050]" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-[#0a1214] border border-[#1e2e2e] rounded-lg py-2.5 pl-10 pr-10 text-[#ece7e2] placeholder-[#3a5050] focus:outline-none focus:border-[#e0a040] transition-colors"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#3a5050] hover:text-[#5a7a7a] transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[#c45a3a]/10 border border-[#c45a3a]/30 rounded-lg">
              <p className="text-[#c45a3a] text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full bg-[#e0a040] hover:bg-[#d49030] text-[#0a1214] font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0a1214] border-t-transparent rounded-full animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Access Analytics</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-[#3a5050]">Protected by MacroCoder Security</p>
        </div>
      </div>
    </div>
  )
}
