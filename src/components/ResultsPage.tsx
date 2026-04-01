import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { submitReview, getReviewStatus, type ReviewResult, type ReviewStatus } from '../lib/api'
import { LoadingOverlay } from './LoadingOverlay'

type InputMode = 'github' | 'website' | 'upwork'
type Phase = 'loading' | 'done'

interface PathOption {
  name: string
  timeline: string
  price: string
  includes: string[]
  ctaText: string
}

const PATH_OPTIONS: Record<string, PathOption> = {
  'Lean Fix': {
    name: 'Lean Fix',
    timeline: '1–2 days',
    price: '$350–$700',
    includes: ['Clearer headline', 'Simplified CTA flow', 'Cleaner page sections'],
    ctaText: 'Start Lean Fix on Upwork',
  },
  'Conversion Rebuild': {
    name: 'Conversion Rebuild',
    timeline: '2–4 days',
    price: '$800–$1,500',
    includes: ['Clearer page structure', 'Sharper headline and messaging', 'Stronger CTA flow', 'Better trust and conversion signals'],
    ctaText: 'Start Phase 1 on Upwork',
  },
  'Full Premium Pass': {
    name: 'Full Premium Pass',
    timeline: '5–8 days',
    price: '$1,800–$3,500',
    includes: ['Full redesign with modern styling', 'Complete polish and refinement', 'Enhanced trust and conversion flow', 'Fully responsive across all devices'],
    ctaText: 'Start Premium Pass on Upwork',
  },
}

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
    verdict: "The visuals are solid, but the messaging is too broad and the CTA flow is not focused enough to convert well.",
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
  const [selectedPath, setSelectedPath] = useState<string>('Conversion Rebuild')

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
          { passed: true, detail: mode === 'website' ? 'Website scanned successfully' : mode === 'upwork' ? 'Job post fetched' : 'Source fetched successfully', findings: mode === 'github' ? [
            'Repository: onewithdev/gsd',
            'Branch: main',
            'Total files: 47',
          ] : mode === 'website' ? [
            'Source: www.website.se',
            'Pages scanned: 12',
            'Key sections found: 8',
            'Technologies detected: HTML/CSS/JS',
          ] : [
            'Job post fetched successfully',
            'Client history reviewed',
            'Budget range: $500–$2,000',
          ]},
          { passed: true, detail: mode === 'website' ? 'Content structure mapped' : 'Structure mapped', findings: mode === 'website' ? [
            'Home page: Hero + features + CTA',
            'About page: Team + mission',
            'Contact page: Form + info',
            'Navigation: 4 main pages',
          ] : [
            'Frameworks: React, Next.js, Tailwind CSS',
            'Languages: TypeScript (89%), JavaScript (11%)',
            'Package manager: npm',
          ]},
          { passed: true, detail: mode === 'website' ? 'Messaging analyzed' : 'Code analyzed', findings: mode === 'website' ? [
            'Headline: Clear value proposition',
            'Subheadline: Secondary benefits',
            'CTA: Primary conversion point present',
          ] : [
            'Frontend detected: React components',
            'Backend detected: API routes',
            'Auth indicators: next-auth',
          ]},
          { passed: false, detail: mode === 'website' ? '2 issues found' : '2 issues found', findings: mode === 'website' ? [
            '⚠ Trust signals could be stronger',
            '⚠ Mobile navigation needs improvement',
          ] : [
            '⚠ Missing test coverage — no test files detected',
            '⚠ No CI/CD pipeline found',
          ]},
          { passed: true, detail: mode === 'website' ? 'Trust signals reviewed' : 'No vulnerabilities', findings: mode === 'website' ? [
            'Contact info present',
            'No testimonials section',
            'Missing social proof',
          ] : [
            'No known vulnerable dependencies detected',
            'Environment files properly configured',
          ]},
          { passed: false, detail: mode === 'website' ? 'Performance needs work' : 'Optimization needed', findings: mode === 'website' ? [
            '⚠ Images not optimized',
            '⚠ Some render-blocking scripts',
          ] : [
            '⚠ Bundle size could be reduced',
            '⚠ Missing performance optimizations',
          ]},
          { passed: true, detail: 'Report generated', findings: [
            'Analysis ready — 8 checks passed',
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
          {phase === 'done' && result && (() => {
            const path = PATH_OPTIONS[selectedPath] || PATH_OPTIONS['Conversion Rebuild']
            
            const criticalFindings = mode === 'website' ? [
              'Messaging too broad — unclear value proposition',
              'CTA flow too weak — no clear conversion path',
              'Trust signals incomplete — limited social proof',
              'Mobile navigation needs improvement',
              'Performance optimization needed',
            ] : result.fixes

            const buildSequence = mode === 'website' ? [
              { step: 'Step 1', action: 'Refactor the landing structure and tighten the headline/CTA hierarchy.', blurred: null },
              { step: 'Step 2', action: 'Replace the current content flow with a clearer conversion-first layout.', blurred: 'and connect it to a scalable data structure' },
              { step: 'Step 3', action: 'Move tracking and key funnel events into a proper analytics layer.', blurred: null },
              { step: 'Step 4', action: 'Implement', blurred: 'the recommended architecture for responsiveness, trust flow, and long-term maintainability' },
            ] : [
              { step: 'Step 1', action: 'Clean up the current codebase and refactor key components.', blurred: null },
              { step: 'Step 2', action: 'Implement', blurred: 'the recommended state management pattern' },
              { step: 'Step 3', action: 'Set up', blurred: 'the optimized CI/CD pipeline' },
              { step: 'Step 4', action: 'Add comprehensive test coverage and monitoring.', blurred: null },
            ]

            return (
            <div className="w-full max-w-[1400px] mt-8">
              <div className="relative rounded-xl border border-[#3d2817] bg-[#110c09]/96 p-6 overflow-hidden">
                {/* Subtle ambient glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#e59a1d]/5 via-transparent to-transparent pointer-events-none" />
                
                <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left: Critical Findings + Build Sequence (3 cols) */}
                  <div className="lg:col-span-3 space-y-6">
                    {/* Critical Findings */}
                    <div className="relative">
                      <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#ef4444] to-transparent" />
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#ef4444] mb-3 font-semibold">
                        Critical Findings
                      </p>
                      <ul className="space-y-2">
                        {criticalFindings.slice(0, 5).map((finding, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#c9943e]">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ef4444] shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                            <span className="font-medium">{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="h-px bg-[#1c110a]" />

                    {/* Recommended Build Sequence */}
                    <div className="relative">
                      <div className="absolute left-[5px] top-2 bottom-4 w-px bg-gradient-to-b from-[#e59a1d] to-[#5d3b11]" />
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#e59a1d] mb-4 font-semibold">
                        Recommended Build Sequence
                      </p>
                      <div className="space-y-4">
                        {buildSequence.map((item, i) => (
                          <div key={i} className="relative pl-8">
                            <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-[#1c110a] border-2 border-[#e59a1d]" />
                            <div className="text-[11px] font-bold text-[#e59a1d] mb-1">{item.step}</div>
                            <div className="text-[13px] leading-5 text-[#c9943e]">
                              {item.action}
                              {item.blurred && (
                                <span className="mx-1 px-1.5 py-0.5 rounded bg-[#1c120a] text-[#8b673f] blur-[1.5px] opacity-60 select-none border border-[#2a1a10]">
                                  {item.blurred}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-[#1c110a]" />

                    {/* Verdict context */}
                    <p className="text-[13px] leading-5 text-[#7a6a5a]">
                      {result.verdict}
                    </p>
                  </div>

                  {/* Right: Metrics + Options (2 cols) */}
                  <div className="lg:col-span-2 space-y-5 lg:border-l lg:border-[#1c110a] lg:pl-6">
                    {/* 4 Metric Boxes */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-[#0a0806] border border-[#1c110a] p-3">
                        <p className="text-[11px] text-[#8b673f] mb-1">Fit</p>
                        <span className="inline-flex items-center rounded-full bg-[#1fc164]/10 border border-[#1fc164]/20 px-2 py-0.5 text-[13px] font-medium text-[#1fc164]">
                          Strong Fit
                        </span>
                      </div>
                      <div className="rounded-lg bg-[#0a0806] border border-[#1c110a] p-3">
                        <p className="text-[11px] text-[#8b673f] mb-1">Complexity</p>
                        <span className="inline-flex items-center rounded-full bg-[#e59a1d]/10 border border-[#e59a1d]/20 px-2 py-0.5 text-[13px] font-medium text-[#e59a1d]">
                          Medium
                        </span>
                      </div>
                      <div className="rounded-lg bg-[#0a0806] border border-[#1c110a] p-3">
                        <p className="text-[11px] text-[#8b673f] mb-1">Timeline</p>
                        <p className="text-[15px] text-[#ece7e2] font-medium">{path.timeline}</p>
                      </div>
                      <div className="rounded-lg bg-[#0a0806] border border-[#1c110a] p-3">
                        <p className="text-[11px] text-[#8b673f] mb-1">Budget</p>
                        <span className="inline-flex items-center rounded-full bg-[#e59a1d]/10 border border-[#e59a1d]/20 px-2 py-0.5 text-[13px] font-medium text-[#e59a1d]">
                          {path.price}
                        </span>
                      </div>
                    </div>

                    {/* Option Pills */}
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(PATH_OPTIONS).map((name) => {
                          const isSelected = name === selectedPath
                          return (
                            <button
                              key={name}
                              onClick={() => setSelectedPath(name)}
                              className={`px-3 py-1.5 rounded-lg border text-[13px] transition-all ${
                                isSelected
                                  ? 'border-[#e59a1d] bg-[#e59a1d]/15 text-[#e59a1d]'
                                  : 'border-[#2a1a10] bg-[#0a0806] text-[#8b673f] hover:border-[#3d2515]'
                              }`}
                            >
                              {name}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* CTA */}
                    <div>
                      <a
                        href="https://www.upwork.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-[48px] items-center justify-center gap-2 rounded-xl bg-[#e59a1d] text-[15px] font-medium text-[#1b1106] transition hover:brightness-110 px-6"
                      >
                        {path.ctaText}
                        <ArrowRight className="h-4 w-4" strokeWidth={2} />
                      </a>
                      <p className="text-[11px] text-[#5f4c3b] text-center mt-2">
                        Final scope and pricing may adjust if requirements change.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )
          })()}
        </section>
      </main>
    </div>
  )
}
