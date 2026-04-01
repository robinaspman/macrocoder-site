import { useState, useEffect } from 'react'
import {
  Terminal,
  Plus,
  Save,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  Globe,
  Github,
  Edit3,
  ArrowUpRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'

type JobStatus = 'new' | 'reviewed' | 'pitched' | 'hired' | 'passed'
type InputMode = 'upwork' | 'github' | 'website' | 'manual'
type ViewMode = 'list' | 'input' | 'detail'

interface SavedJob {
  id: string
  title: string
  client: string
  source: string
  sourceUrl: string
  mode: InputMode
  description: string
  budget: string
  status: JobStatus
  doability: number
  effortHours: string
  redFlags: string[]
  greenFlags: string[]
  notes: string
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<JobStatus, string> = {
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  reviewed: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  pitched: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  hired: 'bg-green-500/20 text-green-400 border-green-500/30',
  passed: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const STATUS_LABELS: Record<JobStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  pitched: 'Pitched',
  hired: 'Hired',
  passed: 'Passed',
}

const MODE_ICONS: Record<InputMode, typeof Briefcase> = {
  upwork: Briefcase,
  github: Github,
  website: Globe,
  manual: Terminal,
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function analyzeDoability(description: string, budget: string): { score: number; hours: string; red: string[]; green: string[] } {
  const text = description.toLowerCase()
  let score = 50
  const red: string[] = []
  const green: string[] = []

  if (text.includes('urgent') || text.includes('asap') || text.includes('rush')) {
    score -= 15
    red.push('Urgent timeline pressure')
  }
  if (text.includes('fix') && text.includes('quick')) {
    score -= 10
    red.push('"Quick fix" — scope creep risk')
  }
  if (text.includes('full stack') || text.includes('end to end') || text.includes('e2e')) {
    score -= 5
    red.push('Full-stack scope — broad surface area')
  }
  if (text.includes('ai') || text.includes('ml') || text.includes('machine learning')) {
    score -= 5
    red.push('AI/ML component — unpredictable complexity')
  }
  if (text.includes('mvp') || text.includes('prototype')) {
    score += 5
    green.push('MVP scope — focused deliverable')
  }
  if (text.includes('react') || text.includes('next.js') || text.includes('vue')) {
    score += 5
    green.push('Modern frontend stack — familiar territory')
  }
  if (text.includes('node') || text.includes('python') || text.includes('go')) {
    score += 5
    green.push('Solid backend stack')
  }
  if (text.includes('test') || text.includes('ci') || text.includes('pipeline')) {
    score += 5
    green.push('Client values quality practices')
  }
  if (text.includes('design') || text.includes('figma') || text.includes('mockup')) {
    score += 5
    green.push('Design assets available')
  }
  if (text.includes('existing') || text.includes('legacy') || text.includes('refactor')) {
    score -= 10
    red.push('Existing codebase — unknown quality')
  }
  if (text.includes('from scratch') || text.includes('greenfield') || text.includes('new project')) {
    score += 10
    green.push('Greenfield project — clean slate')
  }

  const budgetNum = parseInt(budget.replace(/[^0-9]/g, ''))
  if (budgetNum > 5000) {
    score += 15
    green.push('Strong budget signal')
  } else if (budgetNum > 2000) {
    score += 5
    green.push('Reasonable budget')
  } else if (budgetNum > 0 && budgetNum < 500) {
    score -= 15
    red.push('Low budget — may not match scope')
  }

  if (text.length > 500) {
    score += 5
    green.push('Detailed job post — client knows what they want')
  } else if (text.length < 100) {
    score -= 10
    red.push('Vague description — scope unclear')
  }

  score = Math.max(10, Math.min(95, score))

  const hours = score > 70 ? '20-40' : score > 50 ? '40-80' : score > 30 ? '80-160' : '160+'

  return { score, hours, red: red.length ? red : ['No major red flags'], green: green.length ? green : ['Neutral — needs more info'] }
}

export function Dashboard() {
  const [view, setView] = useState<ViewMode>('list')
  const [jobs, setJobs] = useState<SavedJob[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [editingJob, setEditingJob] = useState<SavedJob | null>(null)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)

  // Input form state
  const [formTitle, setFormTitle] = useState('')
  const [formClient, setFormClient] = useState('')
  const [formMode, setFormMode] = useState<InputMode>('upwork')
  const [formSourceUrl, setFormSourceUrl] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formBudget, setFormBudget] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [analysis, setAnalysis] = useState<{ score: number; hours: string; red: string[]; green: string[] } | null>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mc_jobs')
      if (stored) setJobs(JSON.parse(stored))
    } catch { /* empty */ }
  }, [])

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mc_jobs', JSON.stringify(jobs))
    } catch { /* empty */ }
  }, [jobs])

  // Auto-analyze when description changes
  useEffect(() => {
    if (formDescription.trim()) {
      setAnalysis(analyzeDoability(formDescription, formBudget))
    } else {
      setAnalysis(null)
    }
  }, [formDescription, formBudget])

  function resetForm() {
    setFormTitle('')
    setFormClient('')
    setFormMode('upwork')
    setFormSourceUrl('')
    setFormDescription('')
    setFormBudget('')
    setFormNotes('')
    setAnalysis(null)
    setEditingJob(null)
  }

  function handleSave() {
    if (!formTitle.trim() || !formDescription.trim()) return

    const now = new Date().toISOString()
    const a = analysis || { score: 50, hours: 'TBD', red: ['Not analyzed'], green: [] }

    if (editingJob) {
      setJobs(prev => prev.map(j => j.id === editingJob.id ? {
        ...j,
        title: formTitle,
        client: formClient,
        mode: formMode,
        sourceUrl: formSourceUrl,
        description: formDescription,
        budget: formBudget,
        notes: formNotes,
        doability: a.score,
        effortHours: a.hours,
        redFlags: a.red,
        greenFlags: a.green,
        updatedAt: now,
      } : j))
    } else {
      const newJob: SavedJob = {
        id: generateId(),
        title: formTitle,
        client: formClient || 'Unknown',
        source: formMode === 'upwork' ? 'Upwork' : formMode === 'github' ? 'GitHub' : formMode === 'website' ? 'Website' : 'Manual',
        sourceUrl: formSourceUrl,
        mode: formMode,
        description: formDescription,
        budget: formBudget,
        status: 'new',
        doability: a.score,
        effortHours: a.hours,
        redFlags: a.red,
        greenFlags: a.green,
        notes: formNotes,
        createdAt: now,
        updatedAt: now,
      }
      setJobs(prev => [newJob, ...prev])
    }

    resetForm()
    setView('list')
  }

  function handleEdit(job: SavedJob) {
    setEditingJob(job)
    setFormTitle(job.title)
    setFormClient(job.client)
    setFormMode(job.mode)
    setFormSourceUrl(job.sourceUrl)
    setFormDescription(job.description)
    setFormBudget(job.budget)
    setFormNotes(job.notes)
    setView('input')
  }

  function handleDelete(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  function handleStatusChange(id: string, status: JobStatus) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status, updatedAt: new Date().toISOString() } : j))
  }

  function handleNewJob() {
    resetForm()
    setView('input')
  }

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = search === '' ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.client.toLowerCase().includes(search.toLowerCase()) ||
      j.description.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || j.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: jobs.length,
    new: jobs.filter(j => j.status === 'new').length,
    pitched: jobs.filter(j => j.status === 'pitched').length,
    hired: jobs.filter(j => j.status === 'hired').length,
    passed: jobs.filter(j => j.status === 'passed').length,
    avgDoability: jobs.length ? Math.round(jobs.reduce((sum, j) => sum + j.doability, 0) / jobs.length) : 0,
  }

  function doabilityColor(score: number) {
    if (score >= 70) return 'text-green-400'
    if (score >= 50) return 'text-yellow-400'
    if (score >= 30) return 'text-orange-400'
    return 'text-red-400'
  }

  function doabilityBg(score: number) {
    if (score >= 70) return 'bg-green-500/20 border-green-500/30'
    if (score >= 50) return 'bg-yellow-500/20 border-yellow-500/30'
    if (score >= 30) return 'bg-orange-500/20 border-orange-500/30'
    return 'bg-red-500/20 border-red-500/30'
  }

  function doabilityIcon(score: number) {
    if (score >= 70) return <TrendingUp className="h-4 w-4 text-green-400" />
    if (score >= 50) return <Minus className="h-4 w-4 text-yellow-400" />
    return <TrendingDown className="h-4 w-4 text-red-400" />
  }

  // LIST VIEW
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-[#1a1714] text-white [font-family:Inter,ui-sans-serif,system-ui,sans-serif]">
        {/* Header */}
        <header className="border-b border-[#3a2a1a] h-[54px] flex items-center px-6">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full bg-[#ff5f57]" />
            <span className="h-3.5 w-3.5 rounded-full bg-[#febc2e]" />
            <span className="h-3.5 w-3.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="ml-4 text-[11px] uppercase tracking-[0.38em] text-[#b09060]">
            MacroCoder — Job Pipeline
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[12px] text-[#9a8060]">{stats.total} jobs tracked</span>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-6 py-6">
          {/* Stats row */}
          <div className="grid grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, icon: BarChart3, color: 'text-[#e59a1d]' },
              { label: 'New', value: stats.new, icon: Clock, color: 'text-blue-400' },
              { label: 'Pitched', value: stats.pitched, icon: ArrowUpRight, color: 'text-purple-400' },
              { label: 'Hired', value: stats.hired, icon: CheckCircle2, color: 'text-green-400' },
              { label: 'Passed', value: stats.passed, icon: XCircle, color: 'text-red-400' },
              { label: 'Avg Doability', value: `${stats.avgDoability}%`, icon: Zap, color: doabilityColor(stats.avgDoability) },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-[#4a3520] bg-[#2a2218]/95 p-4">
                <div className="flex items-center justify-between mb-1">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-[24px] font-bold text-[#f0ebe5]">{stat.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-[#9a8060]">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-[#4a3520] bg-[#1e1810] px-4 h-[44px]">
              <Search className="h-4 w-4 text-[#9a8060]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search jobs, clients, descriptions..."
                className="flex-1 bg-transparent text-[14px] text-[#c0a070] outline-none placeholder:text-[#5a4a3a] [font-family:'JetBrains_Mono',monospace]"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as JobStatus | 'all')}
                className="appearance-none rounded-xl border border-[#4a3520] bg-[#1e1810] px-4 h-[44px] text-[13px] text-[#c0a070] outline-none pr-8 [font-family:'JetBrains_Mono',monospace]"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="pitched">Pitched</option>
                <option value="hired">Hired</option>
                <option value="passed">Passed</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a8060] pointer-events-none" />
            </div>
            <button
              onClick={handleNewJob}
              className="flex items-center gap-2 rounded-xl bg-[#a66e1b] text-[14px] font-medium text-[#1b1106] px-5 h-[44px] transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              New Job
            </button>
          </div>

          {/* Job list */}
          {filteredJobs.length === 0 ? (
            <div className="rounded-xl border border-[#4a3520] bg-[#2a2218]/95 p-16 text-center">
              <Terminal className="h-12 w-12 text-[#5a4a3a] mx-auto mb-4" />
              <p className="text-[18px] text-[#9a8060] mb-2">No jobs tracked yet</p>
              <p className="text-[14px] text-[#7a6a5a] mb-6">Paste an Upwork job, GitHub repo, or website to get started</p>
              <button
                onClick={handleNewJob}
                className="inline-flex items-center gap-2 rounded-xl bg-[#a66e1b] text-[14px] font-medium text-[#1b1106] px-5 h-[44px] transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Add First Job
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredJobs.map(job => {
                const ModeIcon = MODE_ICONS[job.mode]
                const isExpanded = expandedJob === job.id
                return (
                  <div
                    key={job.id}
                    className={`rounded-xl border transition-all ${isExpanded ? 'border-[#7a5a2a] bg-[#2e2218]' : 'border-[#4a3520] bg-[#2a2218]/95 hover:border-[#5a4a3a]'}`}
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <button
                        onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                        className="flex-shrink-0"
                      >
                        <ChevronRight className={`h-4 w-4 text-[#9a8060] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      <ModeIcon className="h-4 w-4 text-[#b09060] flex-shrink-0" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[15px] font-medium text-[#f0ebe5] truncate">{job.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${STATUS_COLORS[job.status]}`}>
                            {STATUS_LABELS[job.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[12px] text-[#9a8060]">
                          <span>{job.client}</span>
                          <span>{job.source}</span>
                          {job.budget && <span>{job.budget}</span>}
                          <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${doabilityBg(job.doability)}`}>
                          {doabilityIcon(job.doability)}
                          <span className={`text-[14px] font-bold ${doabilityColor(job.doability)}`}>{job.doability}%</span>
                        </div>
                        <span className="text-[12px] text-[#9a8060] w-16 text-right">{job.effortHours}h</span>

                        <div className="flex items-center gap-1">
                          {(['new', 'reviewed', 'pitched', 'hired', 'passed'] as JobStatus[]).map(s => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(job.id, s)}
                              title={STATUS_LABELS[s]}
                              className={`h-6 w-6 rounded flex items-center justify-center text-[10px] transition ${
                                job.status === s
                                  ? 'bg-[#a66e1b] text-[#1b1106]'
                                  : 'bg-[#2a1e14] text-[#6a5a4a] hover:text-[#b09060]'
                              }`}
                            >
                              {s[0].toUpperCase()}
                            </button>
                          ))}
                        </div>

                        <button onClick={() => handleEdit(job)} className="p-1.5 rounded hover:bg-[#2a1e14] text-[#9a8060] hover:text-[#c0a070] transition">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(job.id)} className="p-1.5 rounded hover:bg-[#2a1e14] text-[#9a8060] hover:text-red-400 transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-[#3a2a1a]">
                        <div className="grid grid-cols-2 gap-6 mt-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#9a8060] mb-2">Description</p>
                            <p className="text-[13px] text-[#c0a070] leading-relaxed whitespace-pre-wrap">{job.description}</p>
                            {job.sourceUrl && (
                              <a
                                href={job.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 mt-3 text-[12px] text-[#e59a1d] hover:underline"
                              >
                                {job.sourceUrl}
                                <ArrowUpRight className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div>
                            <div className="mb-4">
                              <p className="text-[10px] uppercase tracking-wider text-green-500/70 mb-2">Green Flags</p>
                              <ul className="space-y-1">
                                {job.greenFlags.map((f, i) => (
                                  <li key={i} className="flex items-start gap-2 text-[12px] text-green-400/80">
                                    <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="mb-4">
                              <p className="text-[10px] uppercase tracking-wider text-red-500/70 mb-2">Red Flags</p>
                              <ul className="space-y-1">
                                {job.redFlags.map((f, i) => (
                                  <li key={i} className="flex items-start gap-2 text-[12px] text-red-400/80">
                                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {job.notes && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-[#9a8060] mb-2">Notes</p>
                                <p className="text-[12px] text-[#b0a080] whitespace-pre-wrap">{job.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    )
  }

  // INPUT VIEW
  return (
    <div className="min-h-screen bg-[#1a1714] text-white [font-family:Inter,ui-sans-serif,system-ui,sans-serif]">
      {/* Header */}
      <header className="border-b border-[#3a2a1a] h-[54px] flex items-center px-6">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-[#ff5f57]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[#febc2e]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-4 text-[11px] uppercase tracking-[0.38em] text-[#b09060]">
          MacroCoder — {editingJob ? 'Edit Job' : 'New Job'}
        </span>
        <button
          onClick={() => { resetForm(); setView('list') }}
          className="ml-auto text-[13px] text-[#9a8060] hover:text-[#c0a070] transition"
        >
          ← Back to Pipeline
        </button>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Input form */}
          <div className="rounded-2xl border border-[#4a3520] bg-[#2a2218]/95 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[#3a2a1a]">
              <Terminal className="h-5 w-5 text-[#e59a1d]" />
              <span className="text-[14px] text-[#f0ebe5]">Job Input</span>
            </div>

            <div className="p-6 space-y-5">
              {/* Source type */}
              <div className="grid grid-cols-4 gap-2">
                {(['upwork', 'github', 'website', 'manual'] as InputMode[]).map(m => {
                  const Icon = MODE_ICONS[m]
                  const active = m === formMode
                  return (
                    <button
                      key={m}
                      onClick={() => setFormMode(m)}
                      className={`flex items-center justify-center gap-2 h-[44px] rounded-lg text-[13px] transition ${
                        active
                          ? 'bg-[#3a2a1a] text-[#e59a1d] border border-[#7a5a2a]'
                          : 'bg-[#251c14] text-[#9a8060] hover:bg-[#2a1e14] hover:text-[#b09060]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  )
                })}
              </div>

              {/* Title */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#9a8060] mb-1.5 block">Job Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. React dashboard for SaaS analytics"
                  className="w-full rounded-xl border border-[#4a3520] bg-[#1e1810] px-4 h-[44px] text-[14px] text-[#c0a070] outline-none placeholder:text-[#5a4a3a] [font-family:'JetBrains_Mono',monospace]"
                />
              </div>

              {/* Client */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#9a8060] mb-1.5 block">Client Name</label>
                <input
                  type="text"
                  value={formClient}
                  onChange={e => setFormClient(e.target.value)}
                  placeholder="e.g. John Doe / Company Inc"
                  className="w-full rounded-xl border border-[#4a3520] bg-[#1e1810] px-4 h-[44px] text-[14px] text-[#c0a070] outline-none placeholder:text-[#5a4a3a] [font-family:'JetBrains_Mono',monospace]"
                />
              </div>

              {/* Source URL */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#9a8060] mb-1.5 block">
                  {formMode === 'upwork' ? 'Upwork Job URL' : formMode === 'github' ? 'GitHub Repo URL' : formMode === 'website' ? 'Website URL' : 'Source URL'}
                </label>
                <input
                  type="text"
                  value={formSourceUrl}
                  onChange={e => setFormSourceUrl(e.target.value)}
                  placeholder={formMode === 'upwork' ? 'https://www.upwork.com/jobs/...' : formMode === 'github' ? 'https://github.com/user/repo' : 'https://...'}
                  className="w-full rounded-xl border border-[#4a3520] bg-[#1e1810] px-4 h-[44px] text-[14px] text-[#c0a070] outline-none placeholder:text-[#5a4a3a] [font-family:'JetBrains_Mono',monospace]"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#9a8060] mb-1.5 block">Budget</label>
                <input
                  type="text"
                  value={formBudget}
                  onChange={e => setFormBudget(e.target.value)}
                  placeholder="e.g. $2,000-5,000 / Fixed / Hourly"
                  className="w-full rounded-xl border border-[#4a3520] bg-[#1e1810] px-4 h-[44px] text-[14px] text-[#c0a070] outline-none placeholder:text-[#5a4a3a] [font-family:'JetBrains_Mono',monospace]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#9a8060] mb-1.5 block">Description *</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Paste the full job description, requirements, or project details..."
                  rows={8}
                  className="w-full rounded-xl border border-[#4a3520] bg-[#1e1810] px-4 py-3 text-[14px] text-[#c0a070] outline-none placeholder:text-[#5a4a3a] [font-family:'JetBrains_Mono',monospace] resize-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#9a8060] mb-1.5 block">Your Notes</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Your thoughts, initial impressions, strategy..."
                  rows={3}
                  className="w-full rounded-xl border border-[#4a3520] bg-[#1e1810] px-4 py-3 text-[14px] text-[#c0a070] outline-none placeholder:text-[#5a4a3a] [font-family:'JetBrains_Mono',monospace] resize-none"
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={!formTitle.trim() || !formDescription.trim()}
                className="flex items-center justify-center gap-2 w-full h-[48px] rounded-xl bg-[#a66e1b] text-[15px] font-medium text-[#1b1106] transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {editingJob ? 'Update Job' : 'Save to Pipeline'}
              </button>
            </div>
          </div>

          {/* Right: Live analysis */}
          <div className="space-y-6">
            {/* Doability score */}
            <div className="rounded-2xl border border-[#4a3520] bg-[#2a2218]/95 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[#3a2a1a]">
                <Zap className="h-5 w-5 text-[#e59a1d]" />
                <span className="text-[14px] text-[#f0ebe5]">Doability Score</span>
              </div>
              <div className="p-6">
                {analysis ? (
                  <div className="text-center">
                    <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-xl border ${doabilityBg(analysis.score)}`}>
                      {doabilityIcon(analysis.score)}
                      <span className={`text-[48px] font-bold ${doabilityColor(analysis.score)}`}>{analysis.score}</span>
                      <span className={`text-[18px] ${doabilityColor(analysis.score)}`}>/ 100</span>
                    </div>
                    <p className="mt-3 text-[14px] text-[#9a8060]">
                      Estimated effort: <span className="text-[#c0a070] font-mono">{analysis.hours} hours</span>
                    </p>
                    <p className="mt-1 text-[12px] text-[#7a6a5a]">
                      {analysis.score >= 70 ? 'Strong candidate — worth pursuing' : analysis.score >= 50 ? 'Viable with careful scoping' : analysis.score >= 30 ? 'Proceed with caution' : 'High risk — likely not worth it'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Zap className="h-8 w-8 text-[#5a4a3a] mx-auto mb-3" />
                    <p className="text-[14px] text-[#7a6a5a]">Start typing a description to see live analysis</p>
                  </div>
                )}
              </div>
            </div>

            {/* Green flags */}
            <div className="rounded-2xl border border-[#4a3520] bg-[#2a2218]/95 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[#3a2a1a]">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-[14px] text-[#f0ebe5]">Green Flags</span>
              </div>
              <div className="p-6">
                {analysis && analysis.green.length > 0 ? (
                  <ul className="space-y-2">
                    {analysis.green.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-green-400/80">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-[#7a6a5a] text-center py-4">No signals detected yet</p>
                )}
              </div>
            </div>

            {/* Red flags */}
            <div className="rounded-2xl border border-[#4a3520] bg-[#2a2218]/95 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[#3a2a1a]">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-[14px] text-[#f0ebe5]">Red Flags</span>
              </div>
              <div className="p-6">
                {analysis && analysis.red.length > 0 ? (
                  <ul className="space-y-2">
                    {analysis.red.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-red-400/80">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-[#7a6a5a] text-center py-4">No signals detected yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
