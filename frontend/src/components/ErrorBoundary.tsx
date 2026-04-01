'use client'

import { Component, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-[#050403] flex items-center justify-center px-6">
            <div className="w-full max-w-[630px] rounded-2xl border border-[#2a1a10] bg-[#120c0a]/95 p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-[#c45a3a]" />
                <h2 className="text-xl font-semibold text-[#f2ece5]">Something went wrong</h2>
              </div>
              <p className="text-[#a47a52] text-sm mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="h-11 px-6 rounded-md bg-[#a66e1b] text-[#fff7ea] text-sm font-medium hover:brightness-110 transition"
              >
                Reload page
              </button>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
