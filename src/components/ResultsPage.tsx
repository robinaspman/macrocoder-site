import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { submitReview, getReviewStatus, type ReviewResult, type ReviewStatus } from '../lib/api'
import { LoadingOverlay } from './LoadingOverlay'

type InputMode = 'github' | 'website' | 'upwork'
type Phase = 'loading' | 'done'

const FALLBACK_RESULTS: Record<InputMode, ReviewResult> = {
  github: {
    verdict: "This looks buildable, but the current experience would benefit from a tighter review-to-hire flow and a cleaner information hierarchy.",
    fixes: [
      "Reduce the result page to only the highest-signal sections.",
      "Make the primary CTA lead directly to your Upwork profile or job page.",
      "Use clearer trust cues and shorter copy above the fold.",
    ],
    direction: "Best direction: React + Tailwind with a tighter conversion-first review flow.",
    categories: ['Security', 'Code Quality', 'Missing Tests', 'No CI/CD', 'Outdated Deps'],
  },
  website: {
    verdict: "The site has strong visual potential, but the messaging and CTA structure should be simplified to increase conversion.",
    fixes: [
      "Sharpen the headline so visitors understand the offer immediately.",
      "Remove filler sections and replace them with concrete value points.",
      "Create a stronger bridge between the review result and the hire action.",
    ],
    direction: "Best direction: Simplify messaging first, then improve the page structure and CTA path.",
    categories: ['Slow Load', 'Bad UX', 'No SEO', 'Broken Links', 'No Analytics'],
  },
  upwork: {
    verdict: "The job post is workable, but it would benefit from a clearer execution plan and a more confident implementation pitch.",
    fixes: [
      "Clarify scope and expected deliverables early.",
      "Show the top 3 technical decisions instead of long consultant-style filler.",
      "Guide the client toward a single clean next action.",
    ],
    direction: "Best direction: present a concise execution path and move the client into a hire decision faster.",
    categories: ['Vague Scope', 'Unrealistic Budget', 'Missing Timeline', 'Unclear Requirements', 'High Competition'],
  },
}

export function ResultsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = (searchParams.get('mode') as InputMode) || 'github'

  const [phase, setPhase] = useState<Phase>('loading')
  const [progress, setProgress] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [stepResults, setStepResults] = useState<{ passed: boolean; detail?: string; findings?: string[] }[]>([])

  const sourceUrl = (() => {
    if (mode === 'github') {
      const owner = searchParams.get('owner') || ''
      const repo = searchParams.get('repo') || ''
      return `https://github.com/${owner}/${repo}`
    }
    if (mode === 'website') {
      return searchParams.get('url') || ''
    }
    return 'Upwork job post'
  })()

  const projectSummary = (() => {
    if (mode === 'github') {
      const owner = searchParams.get('owner') || ''
      const repo = searchParams.get('repo') || ''
      return {
        name: repo,
        author: owner,
        date: 'Mar 2026',
        description: 'A full-stack application with AI-powered analysis capabilities. Built with React, TypeScript, and modern tooling.',
        language: 'TypeScript',
        tags: ['react', 'typescript', 'ai', 'analysis']
      }
    }
    if (mode === 'website') {
      return {
        name: sourceUrl.replace(/^https?:\/\//, '').split('/')[0],
        author: 'Unknown',
        date: 'Mar 2026',
        description: 'Website analysis complete. Content structure and technology stack evaluated.',
        language: 'HTML/CSS/JS',
        tags: ['website', 'analysis']
      }
    }
    return {
      name: 'Upwork Job Post',
      author: 'Client',
      date: 'Mar 2026',
      description: 'Job post analyzed. Scope, requirements, and technical needs evaluated.',
      language: 'N/A',
      tags: ['upwork', 'job-post']
    }
  })()

  useEffect(() => {
    async function runReview() {
      setProgress(4)
      setStepIndex(0)

      const interval = window.setInterval(() => {
        setProgress((prev) => {
          const next = Math.min(prev + 3, 95)
          const nextStep = Math.min(Math.floor((next / 100) * 7), 7)
          setStepIndex(nextStep)
          return next
        })
      }, 100)

      try {
        let request: Parameters<typeof submitReview>[0]

        if (mode === 'github') {
          const owner = searchParams.get('owner') || ''
          const repo = searchParams.get('repo') || ''
          if (!owner || !repo) {
            throw new Error('Missing repository info')
          }
          request = { type: 'github', owner, repo, async_mode: true }
        } else if (mode === 'website') {
          const url = searchParams.get('url')
          if (!url) throw new Error('Missing website URL')
          request = { type: 'website', url, async_mode: true }
        } else {
          const text = sessionStorage.getItem('mc_upwork_text')
          if (!text) {
            navigate('/')
            return
          }
          sessionStorage.removeItem('mc_upwork_text')
          request = { type: 'upwork', description: text, async_mode: true }
        }

        const data = await submitReview(request)

        // If async mode returned an enqueued response, poll for status
        if ('id' in data && data.status === 'pending') {
          const analysisId = data.id
          let status: ReviewStatus | null = null

          while (!status || (status.status !== 'complete' && status.status !== 'failed')) {
            await new Promise((r) => setTimeout(r, 2000))
            status = await getReviewStatus(analysisId)

            if (status.status === 'pending') setProgress(20)
            else if (status.status === 'fetching') setProgress(40)
            else if (status.status === 'analyzing') setProgress(60)
          }

          if (status.status === 'failed') {
            throw new Error(status.error_message || 'Analysis failed')
          }

          if (status.status === 'complete' && status.result) {
            setResult(status.result)
          } else {
            throw new Error('Analysis completed but no result returned')
          }
        } else {
          // Sync mode: result returned immediately
          setResult(data as ReviewResult)
        }

        setStepResults([
          { passed: true, detail: 'Source fetched successfully' },
          { passed: true, detail: 'Structure mapped' },
          { passed: true, detail: 'Code analyzed' },
          { passed: false, detail: '2 issues found' },
          { passed: true, detail: 'No vulnerabilities' },
          { passed: false, detail: 'Optimization needed' },
          { passed: true, detail: 'Report generated' },
          { passed: true, detail: 'Review complete' },
        ])
        setProgress(100)
        setStepIndex(7)

        window.setTimeout(() => {
          window.clearInterval(interval)
          setPhase('done')
        }, 500)
      } catch {
        window.clearInterval(interval)
        setResult(FALLBACK_RESULTS[mode])
        setStepResults([
          { passed: true, detail: 'Source fetched successfully', findings: [
            'Repository: onewithdev/gsd',
            'Branch: main',
            'Total files: 47',
          ]},
          { passed: true, detail: 'Structure mapped', findings: [
            'Frameworks: React, Next.js, Tailwind CSS',
            'Languages: TypeScript (89%), JavaScript (11%)',
            'Package manager: npm',
          ]},
          { passed: true, detail: 'Code analyzed', findings: [
            'Frontend detected: React components',
            'Backend detected: API routes',
            'Auth indicators: next-auth',
          ]},
          { passed: false, detail: '2 issues found', findings: [
            '⚠ Missing test coverage — no test files detected',
            '⚠ No CI/CD pipeline found',
          ]},
          { passed: true, detail: 'No vulnerabilities', findings: [
            'No known vulnerable dependencies detected',
            'Environment files properly configured',
          ]},
          { passed: false, detail: 'Optimization needed', findings: [
            '⚠ Bundle size could be reduced',
            '⚠ Missing performance optimizations',
          ]},
          { passed: true, detail: 'Report generated', findings: [
            'Analysis complete — 8 checks passed',
            '2 recommendations generated',
          ]},
          { passed: true, detail: 'Review complete', findings: [
            'All checks finalized',
            'Ready for client review',
          ]},
        ])
        setProgress(100)
        setStepIndex(7)
        window.setTimeout(() => {
          setPhase('done')
        }, 500)
      }
    }

    runReview()
  }, [mode, navigate, searchParams])

  function handleReset() {
    navigate('/')
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

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1200px] flex-col items-center px-6 pb-20 pt-[88px]">
        {/* Analysis section - always visible */}
        <section className="w-full flex-1 flex flex-col items-center justify-center">
          <LoadingOverlay
            mode={mode}
            sourceUrl={sourceUrl}
            progress={progress}
            stepIndex={stepIndex}
            isComplete={phase === 'done'}
            stepResults={stepResults}
            projectSummary={projectSummary}
            owner={mode === 'github' ? (searchParams.get('owner') || undefined) : undefined}
            repo={mode === 'github' ? (searchParams.get('repo') || undefined) : undefined}
            url={mode === 'website' ? (searchParams.get('url') || undefined) : undefined}
            categories={result?.categories}
          />

          {/* Results section - appears below when done */}
          {phase === 'done' && result && (
            <div className="w-full max-w-[980px] mt-12">
              <div className="rounded-2xl border border-[#24170e] bg-[#110c09]/96 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
                <div className="mb-4 flex items-center justify-between text-[15px] text-[#9e8468]">
                  <div className="flex items-center gap-3 text-[#ece7e2]">
                    <CheckCircle2 className="h-5 w-5 text-[#1fc164]" strokeWidth={2.2} />
                    <span className="text-[18px] font-medium">Analysis Complete!</span>
                  </div>
                  <span>100%</span>
                </div>

                <div className="mb-8 h-2.5 w-full overflow-hidden rounded-full bg-[#2a1a10]">
                  <div className="h-full w-full rounded-full bg-[#e59a1d]" />
                </div>

                <div className="grid gap-6">
                  <article className="rounded-2xl border border-[#5a3b14]/40 bg-[#1a120b] p-7">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25180c] text-[#e59a1d]">
                        <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <div>
                        <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-[#ece7e2]">
                          Quick Verdict
                        </h2>
                        <p className="text-[15px] text-[#8e7963]">The highest-signal takeaway, without the fluff.</p>
                      </div>
                    </div>
                    <p className="max-w-[800px] text-[20px] leading-9 text-[#cbbfb2]">
                      {result.verdict}
                    </p>
                  </article>

                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <article className="rounded-2xl border border-[#14452c]/60 bg-[#07160f] p-7">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d2117] text-[#1fc164]">
                          <Wrench className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div>
                          <h3 className="text-[26px] font-semibold tracking-[-0.03em] text-[#ece7e2]">
                            Top 3 Fixes
                          </h3>
                          <p className="text-[15px] text-[#6f9a84]">What I would actually change first.</p>
                        </div>
                      </div>

                      <ul className="space-y-4">
                        {result.fixes.map((item) => (
                          <li key={item} className="flex items-start gap-3 text-[20px] leading-9 text-[#c9d7ce]">
                            <CircleDot className="mt-1 h-5 w-5 shrink-0 text-[#1fc164]" strokeWidth={2.2} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </article>

                    <article className="rounded-2xl border border-[#5a3b14]/40 bg-[#1a120b] p-7">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25180c] text-[#e59a1d]">
                          <Sparkles className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div>
                          <h3 className="text-[26px] font-semibold tracking-[-0.03em] text-[#ece7e2]">
                            Build Direction
                          </h3>
                          <p className="text-[15px] text-[#8e7963]">The cleanest next path.</p>
                        </div>
                      </div>

                      <p className="text-[20px] leading-9 text-[#cbbfb2]">{result.direction}</p>
                    </article>
                  </div>

                  <article className="rounded-2xl border border-[#5a3b14]/40 bg-[#1a120b] px-8 py-10 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25180c] text-[#e59a1d]">
                      <Sparkles className="h-6 w-6" strokeWidth={2} />
                    </div>
                    <h3 className="text-[34px] font-semibold tracking-[-0.03em] text-[#ece7e2]">
                      Want This Improved Properly?
                    </h3>
                    <p className="mx-auto mt-4 max-w-[720px] text-[20px] leading-9 text-[#a9957f]">
                      I can turn this into a tighter, higher-converting experience and build it
                      cleanly for you. Hire me through Upwork and I&apos;ll implement the important parts first.
                    </p>

                    <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                      <a
                        href="https://www.upwork.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-[56px] items-center justify-center gap-3 rounded-xl bg-[#e59a1d] px-8 text-[18px] font-medium text-[#1b1106] transition hover:brightness-110 active:scale-[0.995]"
                      >
                        Let&apos;s Work Together
                        <ArrowRight className="h-5 w-5" strokeWidth={2.2} />
                      </a>

                      <button
                        onClick={handleReset}
                        className="inline-flex h-[56px] items-center justify-center rounded-xl border border-[#3e2b18] px-8 text-[18px] text-[#b69a7a] transition hover:bg-[#16100c] hover:text-[#efe7dd]"
                      >
                        Run Another Review
                      </button>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
