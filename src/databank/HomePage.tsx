import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Github,
  Globe,
  Layers,
  Loader2,
  Sparkles,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'
import { PROBLEM_CATEGORIES } from '../constants'

type InputMode = 'github' | 'website' | 'upwork' | 'multiple'
const INPUT_MODES: Record<InputMode, { label: string; placeholder: string; helper: string; icon: typeof Github; prefix: string }> = {
  github: {
    label: 'GitHub Repo',
    placeholder: 'https://github.com/user/repo',
    helper: 'Paste a public GitHub repository URL.',
    icon: Github,
    prefix: '$',
  },
  website: {
    label: 'Website URL',
    placeholder: 'https://yourwebsite.com',
    helper: 'Paste a landing page, SaaS site, or product site URL.',
    icon: Globe,
    prefix: '↗',
  },
  upwork: {
    label: 'Upwork Job Post',
    placeholder: 'Paste the job description here...',
    helper: 'Paste the full Upwork job description below. The AI will analyze scope, requirements, and give you a clear execution plan.',
    icon: Briefcase,
    prefix: '⤴',
  },
  multiple: {
    label: 'Multiple',
    placeholder: '',
    helper: 'Provide your GitHub profile, website, and Upwork link for a comprehensive review.',
    icon: Layers,
    prefix: '◆',
  },
}

export function HomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<InputMode>('github')
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [githubToken, setGithubToken] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authStep, setAuthStep] = useState<'pending' | 'authorizing' | 'done'>('pending')

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setGithubToken(token)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  const currentMode = useMemo(() => INPUT_MODES[mode], [mode])

  function handleGitHubLogin() {
    setShowAuthModal(true)
    setAuthStep('pending')
  }

  function handleAuthorize() {
    setAuthStep('authorizing')
    setTimeout(() => {
      const mockGithubToken = 'ghp_demo_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      const mockPayload = {
        sub: 'demo-user-' + Date.now(),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
        github_token: mockGithubToken,
        username: 'demo-user',
      }
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const payload = btoa(JSON.stringify(mockPayload))
      const mockJwt = `${header}.${payload}.demo-signature`

      setGithubToken(mockJwt)
      setAuthStep('done')
      setTimeout(() => setShowAuthModal(false), 800)
    }, 1200)
  }

  function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!input.trim()) return

    if (githubToken) {
      sessionStorage.setItem('mc_github_token', githubToken)
    }

    const githubMatch = input.match(/(?:www\.)?github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/)
    if (githubMatch) {
      const [, owner, repo] = githubMatch
      navigate(`/results?mode=github&owner=${owner}&repo=${repo}`)
      return
    }

    const upworkMatch = input.match(/(?:www\.)?upwork\.com\/jobs\/(~[\w]+)/)
    if (upworkMatch) {
      navigate(`/results?mode=upwork&jobId=${upworkMatch[1]}`)
      return
    }

    if (mode === 'upwork') {
      sessionStorage.setItem('mc_upwork_text', input)
      navigate(`/results?mode=upwork`)
      return
    }

    try {
      const urlInput = input.startsWith('www.') ? `https://${input}` : input
      new URL(urlInput)
      navigate(`/results?mode=website&url=${encodeURIComponent(urlInput)}`)
    } catch {
      setError('Please enter a valid URL (GitHub repo, website, or Upwork job post)')
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#050403] text-white relative overflow-hidden [font-family:Inter,ui-sans-serif,system-ui,sans-serif]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(72,30,6,0.14),transparent_46%)]" />
      <div className="absolute top-[34%] left-0 right-0 h-px bg-[#120b07]" />
      <div className="absolute top-[66%] left-0 right-0 h-px bg-[#120b07]" />

      <header className="absolute top-0 left-0 right-0 h-[54px] border-b border-[#1c110a] flex items-center justify-center z-20">
        <div className="absolute left-4 flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-[#ff5f57]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[#febc2e]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[11px] uppercase tracking-[0.38em] text-[#8b673f]">
          Autonomous Agent Review
        </span>
      </header>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1100px] flex-col items-center px-6 pb-20 pt-[88px]">
        <section className="flex w-full flex-1 flex-col items-center justify-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#5d3b11] bg-[#1c120a] px-4 py-2 text-[13px] uppercase tracking-[0.16em] text-[#e59a1d]">
            <Sparkles className="h-4 w-4" strokeWidth={2} />
            Free AI-Powered Review
          </div>

          <h1 className="max-w-[820px] text-center text-[42px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#ece7e2] sm:text-[58px]">
            Get a Professional Review
            <span className="block text-[#e59a1d]">Exclusively Through Upwork</span>
          </h1>

          <p className="mt-6 max-w-[640px] text-center text-[18px] leading-9 text-[#8e7963]">
            Paste your GitHub repo, website URL, or Upwork job post. Get a concise
            technical review and a clear next step if you want me to build it.
          </p>

          <div className="mt-10 w-full max-w-[740px] overflow-hidden rounded-2xl border border-[#2b1a10] bg-[#120c0a]/95 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
            <div className="grid grid-cols-4 border-b border-[#2b1a10]">
              {Object.entries(INPUT_MODES).map(([key, item]) => {
                const Icon = item.icon
                const active = key === mode
                return (
                  <button
                    key={key}
                    onClick={() => { setMode(key as InputMode); setInput('') }}
                    className={`flex h-[62px] items-center justify-center gap-3 text-[16px] transition ${
                      active
                        ? 'bg-[#24170d] text-[#e59a1d] border-b-2 border-[#e59a1d]'
                        : 'bg-[#17100c] text-[#7f6b58] hover:bg-[#1c130e] hover:text-[#aa8a66]'
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="p-6 sm:p-7">
              <p className="mb-4 text-[15px] text-[#84705d]">{currentMode.helper}</p>

              <div className="flex flex-wrap gap-2 mb-5">
                {PROBLEM_CATEGORIES[mode].map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#5d3b11] bg-[#1c120a] px-3 py-1 text-[12px] text-[#c9943e]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#e59a1d]" />
                    {cat}
                  </span>
                ))}
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2.5 rounded-md border border-[#3a1a10] bg-[#1a0d08] px-4 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5 text-[#c45a3a] flex-shrink-0" />
                  <span className="text-[13px] text-[#c45a3a]">{error}</span>
                </div>
              )}

              <form onSubmit={handleAnalyze}>
                {mode === 'upwork' ? (
                  <div className="mb-5 min-h-[140px] rounded-xl border border-[#3c2b1f] bg-[#090605] px-4 py-3 shadow-inner shadow-black/40">
                    <span className="mb-2 block text-[14px] text-[#a97a3b] [font-family:'JetBrains_Mono',ui-monospace,SFMono-Regular,Menlo,monospace]">
                      {currentMode.prefix}
                    </span>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={currentMode.placeholder}
                      rows={5}
                      className="w-full bg-transparent text-[16px] text-[#9e866d] outline-none placeholder:text-[#5f4c3b] [font-family:'JetBrains_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] resize-none"
                    />
                  </div>
                ) : mode === 'multiple' ? (
                  <div className="mb-5 space-y-4">
                    <div className="flex items-center gap-3 rounded-xl border border-[#3c2b1f] bg-[#090605] px-4 h-[52px] shadow-inner shadow-black/40">
                      <Github className="h-4 w-4 text-[#8b673f] flex-shrink-0" />
                      <input
                        type="text"
                        autoComplete="url"
                        placeholder="GitHub profile URL (e.g. https://github.com/user)"
                        className="w-full bg-transparent text-[15px] text-[#9e866d] outline-none placeholder:text-[#5f4c3b] [font-family:'JetBrains_Mono',ui-monospace,SFMono-Regular,Menlo,monospace]"
                      />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-[#3c2b1f] bg-[#090605] px-4 h-[52px] shadow-inner shadow-black/40">
                      <Globe className="h-4 w-4 text-[#8b673f] flex-shrink-0" />
                      <input
                        type="text"
                        autoComplete="url"
                        placeholder="Website URL (e.g. https://yoursite.com)"
                        className="w-full bg-transparent text-[15px] text-[#9e866d] outline-none placeholder:text-[#5f4c3b] [font-family:'JetBrains_Mono',ui-monospace,SFMono-Regular,Menlo,monospace]"
                      />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-[#3c2b1f] bg-[#090605] px-4 h-[52px] shadow-inner shadow-black/40">
                      <Briefcase className="h-4 w-4 text-[#8b673f] flex-shrink-0" />
                      <input
                        type="text"
                        autoComplete="url"
                        placeholder="Upwork profile or job URL"
                        className="w-full bg-transparent text-[15px] text-[#9e866d] outline-none placeholder:text-[#5f4c3b] [font-family:'JetBrains_Mono',ui-monospace,SFMono-Regular,Menlo,monospace]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mb-5 flex h-[56px] items-center rounded-xl border border-[#3c2b1f] bg-[#090605] px-4 shadow-inner shadow-black/40">
                    <span className="mr-3 text-[20px] text-[#9e866d] [font-family:'JetBrains_Mono',ui-monospace,SFMono-Regular,Menlo,monospace]">
                      {currentMode.prefix}
                    </span>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      autoComplete="url"
                      placeholder={currentMode.placeholder}
                      className="w-full bg-transparent text-[20px] text-[#9e866d] outline-none placeholder:text-[#5f4c3b] [font-family:'JetBrains_Mono',ui-monospace,SFMono-Regular,Menlo,monospace]"
                    />
                  </div>
                )}

                {(mode === 'github' || mode === 'multiple') && (
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-[15px] text-[#84705d]">Or</span>
                    <div className="flex-1 h-px bg-[#2b1a10]" />
                  </div>
                )}

                {(mode === 'github' || mode === 'multiple') && (
                  <button
                    type="button"
                    onClick={handleGitHubLogin}
                    className="group relative flex w-full h-[56px] items-center justify-center gap-3 rounded-xl bg-[#2a2d35] mb-5 text-[15px] font-medium text-[#d0d6de] transition-all duration-200 hover:bg-[#333740] active:scale-[0.99]"
                  >
                    {githubToken ? (
                      <>
                        <svg className="h-5 w-5 text-[#1fc164]" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                        </svg>
                        <span>Connected to GitHub</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                        </svg>
                        <span>Connect with GitHub</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="submit"
                  className="flex h-[56px] w-full items-center justify-center gap-3 rounded-xl bg-[#a66e1b] text-[18px] font-medium text-[#1b1106] transition hover:brightness-110 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!input.trim()}
                >
                  <Sparkles className="h-5 w-5" strokeWidth={2} />
                  Start Free Analysis
                  <ArrowRight className="h-5 w-5" strokeWidth={2} />
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px] text-[#8b7967]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1fc164]" />
                  No sign-up required
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1fc164]" />
                  100% free
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1fc164]" />
                  Results in seconds
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1fc164]" />
                  Local Only
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GitHub Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
            <div
              className="w-full max-w-[420px] rounded-2xl border border-[#2b1a10] bg-[#120c0a] shadow-[0_40px_100px_rgba(0,0,0,0.7)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1c110a]">
                <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-[13px] text-[#8e7963]">GitHub Authorization</span>
              </div>

              {/* Modal body */}
              <div className="p-8">
                {authStep === 'pending' && (
                  <div className="text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#2a2d35]">
                      <svg className="h-8 w-8 text-[#d0d6de]" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                      </svg>
                    </div>
                    <h3 className="text-[18px] font-semibold text-[#ece7e2] mb-2">Connect to GitHub</h3>
                    <p className="text-[14px] text-[#8e7963] mb-6">
                      Authorize MacroCoder to access your public repositories for analysis.
                    </p>
                    <button
                      onClick={handleAuthorize}
                      className="w-full h-[48px] rounded-xl bg-[#2a2d35] text-[15px] font-medium text-[#d0d6de] hover:bg-[#333740] transition-all active:scale-[0.98]"
                    >
                      Authorize Access
                    </button>
                    <button
                      onClick={() => setShowAuthModal(false)}
                      className="w-full h-[48px] rounded-xl text-[14px] text-[#6d5235] hover:text-[#a47a52] transition-colors mt-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {authStep === 'authorizing' && (
                  <div className="text-center py-4">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#2a2d35]">
                      <Loader2 className="h-8 w-8 text-[#e59a1d] animate-spin" strokeWidth={2} />
                    </div>
                    <h3 className="text-[18px] font-semibold text-[#ece7e2] mb-2">Connecting...</h3>
                    <p className="text-[14px] text-[#8e7963]">
                      Authorizing with GitHub...
                    </p>
                  </div>
                )}

                {authStep === 'done' && (
                  <div className="text-center py-4">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#0d2117]">
                      <CheckCircle2 className="h-8 w-8 text-[#1fc164]" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-[18px] font-semibold text-[#ece7e2] mb-2">Connected!</h3>
                    <p className="text-[14px] text-[#6f9a84]">
                      GitHub authorization successful.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <section className="w-full max-w-[740px] mt-20 mb-10">
          <h2 className="text-center text-[24px] font-semibold tracking-[-0.02em] text-[#ece7e2] mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <FaqItem
              question="What is this?"
              answer="This is a private review tool I built to quickly assess projects, websites, repositories, and job posts. It helps me give clients faster, clearer feedback before we decide whether to work together on Upwork."
            />
            <FaqItem
              question="Is the review free?"
              answer="Yes. The review itself is free. If you want me to implement the recommendations or build the solution for you, we can discuss that through Upwork."
            />
            <FaqItem
              question="What kind of projects can you review?"
              answer="I can review websites, web apps, SaaS ideas, GitHub repositories, landing pages, and Upwork job posts. The goal is to quickly identify what is working, what is weak, and what should be improved first."
            />
            <FaqItem
              question="Do you use AI in the review process?"
              answer="Yes — I use AI-assisted tools as part of my workflow to speed up analysis and surface useful insights faster. Final recommendations, pricing decisions, and implementation direction are still controlled by me."
            />
            <FaqItem
              question="Will my information stay private?"
              answer="Yes. Project links and details are used only for the review process. For privacy-sensitive work, I can use a more restricted review mode designed to minimize retention and handle sensitive material more carefully."
            />
            <FaqItem
              question="Can I get a quote or price estimate here?"
              answer="Yes. The platform can generate structured estimates based on the scope, complexity, and requirements you provide. Final pricing may change if the scope changes, but the goal is to make the next step much clearer before we start."
            />
            <FaqItem
              question="Can you also build or fix the project?"
              answer="Yes. If the review shows a good fit, I can help redesign, improve, or build the project through Upwork."
            />
            <FaqItem
              question="What happens after the review?"
              answer="You get a concise review, a clearer sense of priorities, and — where relevant — a price direction or milestone suggestion. If you want to move forward, the next step is simple: hire me on Upwork and I can implement the work."
            />
          </div>
        </section>
      </main>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-[#2b1a10] bg-[#120c0a]/95 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left"
      >
        <span className="text-[16px] font-medium text-[#ece7e2]">{question}</span>
        <ChevronDown
          className={`h-5 w-5 text-[#8b673f] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div className="mx-4 mb-5 rounded-lg bg-[#090605] px-8 py-6 border border-[#1c110a]">
          <p className="text-[15px] leading-7 font-medium text-[#c9943e]">
            {answer}
          </p>
        </div>
      )}
    </div>
  )
}
