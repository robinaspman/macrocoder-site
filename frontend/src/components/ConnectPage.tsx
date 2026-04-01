'use client'

import { useState, useEffect } from 'react'
import { Github, Loader2, Check, AlertCircle, Terminal, LogOut, Globe, Briefcase } from 'lucide-react'
import { useAuth } from '@/lib/auth'

type Step = 'connect' | 'analyzing' | 'chat'
type InputType = 'github' | 'website' | 'upwork'

interface AnalysisEvent {
  type: 'status' | 'log' | 'result' | 'error'
  data: string
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

const INPUT_CONFIG: Record<InputType, { icon: typeof Github; label: string; placeholder: string; footer: string }> = {
  github: {
    icon: Github,
    label: 'GitHub Repository',
    placeholder: 'https://github.com/user/repo',
    footer: 'Read-only access requested. Revoke anytime via GitHub settings.'
  },
  website: {
    icon: Globe,
    label: 'Website URL',
    placeholder: 'https://example.com',
    footer: 'We analyze publicly accessible pages only. No login required.'
  },
  upwork: {
    icon: Briefcase,
    label: 'Upwork Job Post',
    placeholder: 'https://www.upwork.com/jobs/~...',
    footer: 'We extract requirements and scope from the job description.'
  }
}

export function ConnectPage() {
  const { token, login, logout, isAuthenticated } = useAuth()
  const [inputType, setInputType] = useState<InputType>('github')
  const [step, setStep] = useState<Step>('connect')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [inputUrl, setInputUrl] = useState('')
  const [terminalLines, setTerminalLines] = useState<string[]>([])
  const [analysis, setAnalysis] = useState<string[]>([])
  const [retryCount, setRetryCount] = useState(0)
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      localStorage.setItem('mc_token', urlToken)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setRetryCount(0)

    if (!inputUrl.trim()) return

    if (inputType === 'github') {
      const match = inputUrl.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/)
      if (match) {
        startAnalysis({ type: 'github', owner: match[1], repo: match[2] })
      } else {
        setError('Please enter a valid GitHub repository URL')
      }
    } else if (inputType === 'website') {
      try {
        new URL(inputUrl)
        startAnalysis({ type: 'website', url: inputUrl })
      } catch {
        setError('Please enter a valid website URL (include https://)')
      }
    } else {
      const match = inputUrl.match(/upwork\.com\/jobs\/(~[\w]+)/)
      if (match) {
        startAnalysis({ type: 'upwork', job_id: match[1], url: inputUrl })
      } else {
        setError('Please enter a valid Upwork job post URL')
      }
    }
  }

  async function startAnalysis(payload: { type: 'github'; owner: string; repo: string } | { type: 'website'; url: string } | { type: 'upwork'; job_id: string; url: string }) {
    setIsLoading(true)
    setStep('analyzing')
    setTerminalLines([])
    setAnalysis([])

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait and try again.')
        }
        if (response.status === 401) {
          throw new Error('Please sign in to analyze')
        }
        throw new Error('Failed to start analysis')
      }

      const data = await response.json()
      const analysisId = data.analysis_id

      await subscribeToStream(analysisId)
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setStep('connect')
    } finally {
      setIsLoading(false)
    }
  }

  async function subscribeToStream(analysisId: string) {
    try {
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${BACKEND_URL}/api/analyze/${analysisId}/stream`, { headers })
      if (!response.ok) throw new Error('Failed to connect to stream')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: AnalysisEvent = JSON.parse(line.slice(6))
              if (event.type === 'log') {
                setTerminalLines(prev => [...prev, event.data])
              } else if (event.type === 'result') {
                setAnalysis(prev => [...prev, event.data])
              } else if (event.type === 'error') {
                setError(event.data)
                setStep('connect')
                return
              }
            } catch {
              // skip malformed events
            }
          }
        }
      }

      setStep('chat')
    } catch {
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000
        setRetryCount(prev => prev + 1)
        setTerminalLines(prev => [...prev, `> Connection lost, retrying in ${delay / 1000}s...`])
        const timer = setTimeout(() => subscribeToStream(analysisId), delay)
        setPollingTimer(timer)
      } else {
        setError('Stream connection failed after retries. Check results manually.')
        setStep('connect')
      }
    }
  }

  useEffect(() => {
    return () => {
      if (pollingTimer) clearTimeout(pollingTimer)
    }
  }, [pollingTimer])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#050403] text-white relative overflow-hidden [font-family:var(--font-inter)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(72,30,6,0.16),transparent_45%)]" />

        <header className="absolute top-0 left-0 right-0 h-[54px] border-b border-[#1c110a] flex items-center justify-center">
          <div className="absolute left-4 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[11px] uppercase tracking-[0.38em] text-[#8b673f]">
            Autonomous Agent Review
          </span>
        </header>

        <div className="absolute top-[210px] left-0 right-0 h-px bg-[#120b07]" />

        <main className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <section className="w-full max-w-[630px] rounded-2xl border border-[#2a1a10] bg-[#120c0a]/95 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
            <div className="px-8 py-9 sm:px-10 text-center">
              <div className="flex justify-center mb-6">
                <div className="h-14 w-14 rounded-lg border border-[#3a281c] bg-[#16100d] flex items-center justify-center">
                  <Github className="h-7 w-7 text-[#b67722]" strokeWidth={1.8} />
                </div>
              </div>
              <h1 className="text-[31px] leading-none font-semibold tracking-[-0.03em] text-[#f2ece5] mb-4">
                Sign in with GitHub
              </h1>
              <p className="text-[15px] leading-7 text-[#a47a52] mb-8">
                Connect your GitHub account to start analyzing repositories, websites, and job posts with our autonomous AI agent.
              </p>
              <button
                onClick={login}
                className="h-[45px] w-full rounded-md border border-[#bc8a35]/25 bg-[#a66e1b] text-[#fff7ea] text-[15px] font-medium flex items-center justify-center gap-2 transition hover:brightness-110 active:scale-[0.995]"
              >
                <Github className="h-5 w-5" strokeWidth={2} />
                <span>Continue with GitHub</span>
              </button>
            </div>
          </section>
        </main>
      </div>
    )
  }

  const config = INPUT_CONFIG[inputType]
  const Icon = config.icon

  return (
    <div className="min-h-screen w-full bg-[#050403] text-white relative overflow-hidden [font-family:var(--font-inter)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(72,30,6,0.16),transparent_45%)]" />

      <header className="absolute top-0 left-0 right-0 h-[54px] border-b border-[#1c110a] flex items-center justify-center">
        <div className="absolute left-4 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[11px] uppercase tracking-[0.38em] text-[#8b673f]">
          {step === 'analyzing' ? 'Analyzing' : step === 'chat' ? 'Analysis Complete' : 'Autonomous Agent Review'}
        </span>
        <button
          onClick={logout}
          className="absolute right-4 flex items-center gap-1.5 text-[11px] text-[#6d5235] hover:text-[#a47a52] transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign out</span>
        </button>
      </header>

      <div className="absolute top-[210px] left-0 right-0 h-px bg-[#120b07]" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <section className="w-full max-w-[630px] rounded-2xl border border-[#2a1a10] bg-[#120c0a]/95 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
          <div className="px-8 py-9 sm:px-10">
            {step === 'connect' && (
              <>
                {/* Input type tabs */}
                <div className="flex gap-1 mb-7 bg-[#090605] rounded-md p-1">
                  {(['github', 'website', 'upwork'] as InputType[]).map((type) => {
                    const c = INPUT_CONFIG[type]
                    const CIcon = c.icon
                    return (
                      <button
                        key={type}
                        onClick={() => { setInputType(type); setError(null); setInputUrl('') }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-[13px] font-medium transition ${
                          inputType === type
                            ? 'bg-[#a66e1b] text-[#fff7ea]'
                            : 'text-[#6d5235] hover:text-[#a47a52]'
                        }`}
                      >
                        <CIcon className="h-4 w-4" strokeWidth={2} />
                        <span className="hidden sm:inline">{c.label}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-4 mb-7">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#3a281c] bg-[#16100d]">
                    <Icon className="h-6 w-6 text-[#b67722]" strokeWidth={1.8} />
                  </div>
                  <h1 className="text-[31px] leading-none font-semibold tracking-[-0.03em] text-[#f2ece5]">
                    {config.label}
                  </h1>
                </div>

                <p className="mx-auto mb-7 max-w-[520px] text-center text-[15px] leading-7 text-[#a47a52]">
                  {inputType === 'github' && 'Paste your GitHub repository URL. The agent will analyze your codebase and provide actionable feedback.'}
                  {inputType === 'website' && 'Paste any website URL. The agent will analyze the site structure, content, and technology stack.'}
                  {inputType === 'upwork' && 'Paste an Upwork job post URL. The agent will extract requirements, scope, and provide a technical breakdown.'}
                </p>

                {error && (
                  <div className="mb-4 flex items-center gap-2.5 rounded-md border border-[#3a1a10] bg-[#1a0d08] px-4 py-2.5">
                    <AlertCircle className="h-3.5 w-3.5 text-[#c45a3a] flex-shrink-0" />
                    <span className="text-[13px] text-[#c45a3a]">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3 h-[43px] rounded-md border border-[#4b3a2d] bg-[#090605] flex items-center px-4">
                    <span className="mr-2 text-[14px] text-[#a97a3b] [font-family:var(--font-mono)]">$</span>
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder={config.placeholder}
                      className="w-full bg-transparent outline-none text-[14px] text-[#a97a3b] placeholder:text-[#7f6244] [font-family:var(--font-mono)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-[45px] w-full rounded-md border border-[#bc8a35]/25 bg-[#a66e1b] text-[#fff7ea] text-[15px] font-medium flex items-center justify-center gap-2 transition hover:brightness-110 active:scale-[0.995] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Icon className="h-5 w-5" strokeWidth={2} />
                        <span>Analyze</span>
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-5 text-center text-[13px] text-[#6d5235] [font-family:var(--font-mono)]">
                  {config.footer}
                </p>
              </>
            )}

            {step === 'analyzing' && (
              <>
                <div className="flex items-center gap-4 mb-7">
                  <Terminal className="h-7 w-7 text-[#b67722]" strokeWidth={1.8} />
                  <h1 className="text-[31px] leading-none font-semibold tracking-[-0.03em] text-[#f2ece5]">
                    {inputType === 'github' ? 'Analyzing Codebase' : inputType === 'website' ? 'Analyzing Website' : 'Analyzing Job Post'}
                  </h1>
                </div>

                <p className="mx-auto mb-7 max-w-[520px] text-center text-[15px] leading-7 text-[#a47a52]">
                  {inputType === 'github' && 'The agent is reading your repository structure, dependencies, and key files.'}
                  {inputType === 'website' && 'The agent is crawling pages, analyzing structure, and evaluating the tech stack.'}
                  {inputType === 'upwork' && 'The agent is extracting requirements, scope, and generating a technical breakdown.'}
                </p>

                <div className="mb-6 rounded-md border border-[#2a1a10] bg-[#090605] p-5 [font-family:var(--font-mono)] text-[13px] leading-7 max-h-[300px] overflow-y-auto">
                  {terminalLines.map((line, index) => (
                    <div key={index} className="py-0.5">
                      <span className="text-[#5a4228]">{line.split(' ')[0]}</span>
                      <span className={
                        line.includes('complete') || line.includes('received')
                          ? 'text-[#b67722]'
                          : 'text-[#a47a52]'
                      }>
                        {line.split(' ').slice(1).join(' ')}
                      </span>
                    </div>
                  ))}
                  <div className="mt-1 text-[#b67722]">
                    <span className="animate-pulse">▊</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <ProgressStep label="Fetch" status={terminalLines.length > 2 ? 'complete' : 'running'} />
                  <ProgressStep label="Analyze" status={terminalLines.length > 5 ? 'complete' : 'pending'} />
                  <ProgressStep label="Report" status={terminalLines.length > 8 ? 'complete' : 'pending'} />
                </div>
              </>
            )}

            {step === 'chat' && (
              <>
                <div className="flex items-center gap-4 mb-7">
                  <Check className="h-7 w-7 text-[#b67722]" strokeWidth={1.8} />
                  <h1 className="text-[31px] leading-none font-semibold tracking-[-0.03em] text-[#f2ece5]">
                    Analysis Complete
                  </h1>
                </div>

                <div className="mb-6 rounded-md border border-[#2a1a10] bg-[#090605] p-5 text-[14px] leading-7 max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                  {analysis.length > 0 ? (
                    <p className="text-[#a47a52]">{analysis.join('')}</p>
                  ) : (
                    <p className="text-[#6d5235]">Analysis results will appear here.</p>
                  )}
                </div>

                <button
                  onClick={() => { setStep('connect'); setInputUrl(''); setTerminalLines([]); setAnalysis([]) }}
                  className="h-[45px] w-full rounded-md border border-[#bc8a35]/25 bg-[#a66e1b] text-[#fff7ea] text-[15px] font-medium flex items-center justify-center gap-2 transition hover:brightness-110 active:scale-[0.995]"
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                  <span>Analyze Another</span>
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function ProgressStep({ label, status }: { label: string; status: 'complete' | 'running' | 'pending' }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`h-6 w-6 rounded-[3px] flex items-center justify-center ${
        status === 'complete'
          ? 'bg-[#a66e1b]/20 border border-[#a66e1b]/30'
          : status === 'running'
            ? 'bg-[#a66e1b]/10 border border-[#a66e1b]/20'
            : 'bg-[#1a1210] border border-[#2a1a10]'
      }`}>
        {status === 'complete' ? (
          <Check className="h-3.5 w-3.5 text-[#b67722]" strokeWidth={2.5} />
        ) : status === 'running' ? (
          <Loader2 className="h-3.5 w-3.5 text-[#b67722] animate-spin" strokeWidth={2} />
        ) : (
          <div className="h-2 w-2 rounded-full bg-[#3a281c]" />
        )}
      </div>
      <span className={`text-[12px] [font-family:var(--font-mono)] ${
        status === 'complete' ? 'text-[#b67722]' :
        status === 'running' ? 'text-[#a47a52]' :
        'text-[#4a3828]'
      }`}>{label}</span>
    </div>
  )
}
