'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface AuthContextType {
  token: string | null
  login: () => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false
})

function getTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('mc_token')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(getTokenFromStorage)

  function login() {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/auth/login`
  }

  function logout() {
    localStorage.removeItem('mc_token')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
