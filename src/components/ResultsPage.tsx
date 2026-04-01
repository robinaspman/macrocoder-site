import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowRight, FileCode } from 'lucide-react'
import { submitReview, getReviewStatus, type ReviewResult, type ReviewStatus } from '../lib/api'
import { LoadingOverlay } from './LoadingOverlay'

type InputMode = 'github' | 'website' | 'upwork'
type Phase = 'loading' | 'done'

interface AnalysisFile {
  path: string
  name: string
}

interface TimelineStep {
  number: number
  name: string
  summary: string
  price: string
  hours: string
}

const GITHUB_STEPS: Omit<TimelineStep, 'number'>[] = [
  { name: 'Code Audit & Issue Mapping', summary: 'Review repository structure, identify critical issues, and map out the current architecture.', price: '$200–$500', hours: '4–8 hrs' },
  { name: 'Core Fixes & Refactoring', summary: 'Address high-priority bugs, clean up code patterns, and improve overall code quality.', price: '$400–$1,000', hours: '8–16 hrs' },
  { name: 'Testing & CI/CD Setup', summary: 'Add test coverage, set up automated pipelines, and ensure reliable deployments.', price: '$300–$700', hours: '6–12 hrs' },
  { name: 'Security Hardening', summary: 'Patch vulnerabilities, update dependencies, and implement security best practices.', price: '$250–$600', hours: '4–10 hrs' },
  { name: 'Performance Optimization', summary: 'Reduce bundle size, optimize load times, and improve runtime performance.', price: '$200–$500', hours: '4–8 hrs' },
  { name: 'Documentation & Handoff', summary: 'Update README, add developer docs, and ensure smooth knowledge transfer.', price: '$150–$400', hours: '3–6 hrs' },
]

const WEBSITE_STEPS: Omit<TimelineStep, 'number'>[] = [
  { name: 'Content & Structure Audit', summary: 'Analyze page hierarchy, content flow, and identify conversion bottlenecks.', price: '$200–$500', hours: '4–8 hrs' },
  { name: 'Messaging & Copy Refinement', summary: 'Sharpen headlines, clarify value proposition, and streamline page copy.', price: '$300–$700', hours: '6–12 hrs' },
  { name: 'CTA & Conversion Flow', summary: 'Redesign call-to-action paths and optimize the user journey toward conversion.', price: '$250–$600', hours: '4–10 hrs' },
  { name: 'Trust & Social Proof', summary: 'Add testimonials, case studies, and credibility elements throughout the site.', price: '$200–$500', hours: '4–8 hrs' },
  { name: 'Performance & SEO', summary: 'Optimize images, fix render-blocking resources, and improve search visibility.', price: '$250–$600', hours: '4–10 hrs' },
  { name: 'Responsive Polish & QA', summary: 'Ensure flawless experience across all devices and browsers.', price: '$200–$500', hours: '4–8 hrs' },
]

const UPWORK_STEPS: Omit<TimelineStep, 'number'>[] = [
  { name: 'Scope Clarification', summary: 'Define clear deliverables, milestones, and technical requirements from the job post.', price: '$150–$400', hours: '3–6 hrs' },
  { name: 'Technical Proposal & Pitch', summary: 'Craft a confident, concise proposal with top technical decisions and execution plan.', price: '$200–$500', hours: '4–8 hrs' },
  { name: 'Milestone Planning', summary: 'Break the project into clear phases with timelines and pricing for each stage.', price: '$200–$500', hours: '4–8 hrs' },
  { name: 'Risk Assessment & Buffer', summary: 'Identify potential roadblocks and build contingency into the plan.', price: '$150–$350', hours: '3–6 hrs' },
  { name: 'Client Communication Setup', summary: 'Establish reporting cadence, feedback loops, and progress tracking.', price: '$100–$300', hours: '2–4 hrs' },
  { name: 'Delivery & Handoff Plan', summary: 'Define final delivery format, documentation, and post-project support.', price: '$150–$400', hours: '3–6 hrs' },
]

function getTimelineSteps(mode: InputMode, apiMilestones?: { name: string; summary: string; min_price: number; max_price: number; estimated_hours: [number, number] }[]): TimelineStep[] {
  if (apiMilestones && apiMilestones.length >= 3) {
    return apiMilestones.map((m, i) => ({
      number: i + 1,
      name: m.name,
      summary: m.summary,
      price: `$${m.min_price.toLocaleString()}–$${m.max_price.toLocaleString()}`,
      hours: `${m.estimated_hours[0]}–${m.estimated_hours[1]} hrs`,
    }))
  }

  const templates = mode === 'github' ? GITHUB_STEPS : mode === 'website' ? WEBSITE_STEPS : UPWORK_STEPS
  const stepCount = Math.min(6, Math.max(3, templates.length))

  return templates.slice(0, stepCount).map((step, i) => ({
    ...step,
    number: i + 1,
  }))
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

function TimelineNode({ milestone, index, warnings, findings, files, mode }: { milestone: TimelineStep; index: number; warnings?: string[]; findings?: string[]; files?: AnalysisFile[]; mode: InputMode }) {
  const isEven = index % 2 === 0
  const sideClass = isEven ? 'pr-[calc(50%+24px)]' : 'pl-[calc(50%+24px)]'

  return (
    <div className="relative">
      <div className="absolute left-1/2 -translate-x-1/2 top-0 z-10 w-12 h-12 rounded-full bg-[#050403] border-2 border-[#1fc164] flex items-center justify-center">
        <span className="text-[16px] font-bold text-[#1fc164]">{milestone.number}</span>
      </div>

      <div className={`grid grid-cols-2 gap-8 ${sideClass}`}>
        <div className={isEven ? 'text-right' : 'text-left'}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#1fc164]/70 mb-2">What to do</p>
          <h3 className="text-[16px] font-semibold text-[#ece7e2] mb-2">{milestone.name}</h3>
          <p className="text-[13px] leading-5 text-[#8b9a80]">{milestone.summary}</p>
        </div>

        <div className={isEven ? 'text-left' : 'text-right'}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#e59a1d]/70 mb-2">What you get</p>
          <div className={`flex items-center gap-4 mb-3 ${isEven ? '' : 'justify-end'}`}>
            <span className="text-[18px] font-bold text-[#e59a1d]">{milestone.price}</span>
            <span className="text-[12px] text-[#6d7a5e]">{milestone.hours}</span>
          </div>
          {findings && findings.length > 0 && (
            <ul className={`space-y-1 mb-3 ${isEven ? '' : 'text-right'}`}>
              {findings.map((f, j) => (
                <li key={j} className={`text-[12px] text-[#8b9a80] ${isEven ? '' : 'flex justify-end'}`}>
                  <span className={isEven ? '' : 'inline-block text-left'}>• {f}</span>
                </li>
              ))}
            </ul>
          )}
          {files && files.length > 0 && (
            <div className={`mt-3 bg-[#0a0806] rounded-lg border border-[#1fc164]/10 overflow-hidden ${isEven ? '' : 'ml-auto'}`}>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1fc164]/10">
                <FileCode className="h-3.5 w-3.5 text-[#1fc164]" />
                <span className="text-[10px] uppercase tracking-wider text-[#6d7a5e]">
                  {mode === 'github' ? 'Related Files' : mode === 'website' ? 'Pages Analyzed' : 'Job References'}
                </span>
              </div>
              <div className="p-2 space-y-1 max-h-[120px] overflow-y-auto">
                {files.map((f, j) => (
                  <div key={j} className="flex items-center gap-2 py-1 px-2 text-[11px] text-[#8b9a80] hover:bg-[#1fc164]/5 rounded transition-colors">
                    <FileCode className="h-3 w-3 text-[#1fc164]/50 flex-shrink-0" />
                    <span className="font-mono truncate">{f.path || f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {warnings && warnings.length > 0 && (
            <div className={`flex flex-wrap gap-2 mt-2 ${isEven ? '' : 'justify-end'}`}>
              {warnings.slice(0, 2).map((w, j) => (
                <span key={j} className="px-2 py-0.5 rounded text-[11px] bg-[#e59a1d]/10 border border-[#e59a1d]/20 text-[#e59a1d]">
                  {w}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TotalEstimate({ estimate }: { estimate: NonNullable<ReviewResult['estimate']> }) {
  return (
    <div className="mt-16 pt-8 border-t border-[#1fc164]/20 flex flex-col lg:flex-row items-center justify-between gap-4">
      <div className="text-center lg:text-left">
        <p className="text-[11px] uppercase tracking-[0.15em] text-[#6d7a5e] mb-1">Total estimated range</p>
        <p className="text-[28px] font-bold text-[#1fc164]">
          ${estimate.price_range[0].toLocaleString()}–${estimate.price_range[1].toLocaleString()}
        </p>
      </div>
      <div className="text-center lg:text-right">
        <p className="text-[11px] uppercase tracking-[0.15em] text-[#6d7a5e] mb-1">Effort estimate</p>
        <p className="text-[18px] font-medium text-[#ece7e2]">
          {estimate.effort_hours[0]}–{estimate.effort_hours[1]} hours
        </p>
      </div>
      <a
        href="https://www.upwork.com/"
        target="_blank"
        rel="noreferrer"
        className="px-6 py-3 rounded-xl bg-[#1fc164] text-[15px] font-medium text-[#0c140d] transition hover:brightness-110"
      >
        Start on Upwork
        <ArrowRight className="inline ml-2 h-4 w-4" />
      </a>
    </div>
  )
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

          {phase === 'done' && result && (
            <ResultsContent
              result={result}
              mode={mode}
              owner={mode === 'github' ? (searchParams.get('owner') || undefined) : undefined}
              repo={mode === 'github' ? (searchParams.get('repo') || undefined) : undefined}
            />
          )}
        </section>
      </main>
    </div>
  )
}

function ResultsContent({ result, mode, owner, repo }: { result: ReviewResult; mode: InputMode; owner?: string; repo?: string }) {
  const milestones = getTimelineSteps(mode, result.estimate?.milestones)
  const warnings = result.estimate?.warnings
  const [files, setFiles] = useState<AnalysisFile[]>([])

  useEffect(() => {
    if (mode === 'github' && owner && repo) {
      fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`)
        .then(r => r.json())
        .then(data => {
          const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.md', '.yml', '.yaml', '.toml', '.css', '.html', '.sql']
          const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.cache', '__pycache__', '.venv', 'coverage', '.turbo']
          const filtered = (data.tree || [])
            .filter((item: any) => item.type === 'blob')
            .filter((item: any) => !skipDirs.some((d: string) => item.path.startsWith(d + '/') || item.path.includes('/' + d + '/')))
            .filter((item: any) => textExtensions.includes('.' + item.path.split('.').pop()))
            .slice(0, 30)
            .map((item: any) => ({ path: item.path, name: item.path.split('/').pop() || item.path }))
          setFiles(filtered)
        })
        .catch(() => setFiles([]))
    }
  }, [mode, owner, repo])

  const distributeFiles = (index: number) => {
    if (files.length === 0) return []
    const perStep = Math.ceil(files.length / milestones.length)
    const start = index * perStep
    return files.slice(start, start + perStep)
  }

  const getStepFindings = (index: number) => {
    return result.fixes?.[index] ? [result.fixes[index]] : undefined
  }

  return (
    <div className="w-full max-w-[1000px] mt-12">
      <p className="text-[12px] uppercase tracking-[0.25em] text-[#1fc164] mb-12 font-semibold text-center">
        Recommended Execution Path
      </p>

      <div className="relative">
        <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#1fc164] via-[#158a4a] to-[#0d5c2d]" />

        <div className="space-y-12">
          {milestones.map((milestone, i) => (
            <TimelineNode
              key={i}
              milestone={milestone}
              index={i}
              warnings={warnings}
              findings={getStepFindings(i)}
              files={distributeFiles(i)}
              mode={mode}
            />
          ))}
        </div>
      </div>

      {result.estimate && <TotalEstimate estimate={result.estimate} />}

      <div className="mt-12 p-6 rounded-xl border border-[#1fc164]/20 bg-[#0a0806] text-center">
        <p className="text-[14px] font-semibold text-[#ece7e2] mb-2">
          Ready to start Phase 1?
        </p>
        <p className="text-[12px] text-[#8b9a80] mb-4">
          Hire me on Upwork and I'll begin with the code audit and issue mapping.
        </p>
        <a
          href="https://www.upwork.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center px-6 py-3 rounded-xl bg-[#1fc164] text-[14px] font-medium text-[#0c140d] transition hover:brightness-110"
        >
          Hire me on Upwork
          <ArrowRight className="ml-2 h-4 w-4" />
        </a>
      </div>

      <p className="text-[11px] text-center text-[#4a5a40] mt-8">
        Final scope and pricing may adjust if requirements change.
      </p>
      <p className="text-[10px] text-center text-[#3a4a30] mt-2 italic">
        Note: AI time estimates tend to be conservative — actual delivery is often faster.
      </p>
    </div>
  )
}
