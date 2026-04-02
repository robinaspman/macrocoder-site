import { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Send,
  Search,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  Globe,
  Github,
  Terminal,
  MessageSquare,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react'

type JobStatus = 'new' | 'reviewed' | 'pitched' | 'hired' | 'passed'
type InputMode = 'upwork' | 'github' | 'website' | 'manual'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  analysis?: { score: number; hours: string; red: string[]; green: string[] }
}

interface Conversation {
  id: string
  title: string
  client: string
  source: string
  sourceUrl: string
  mode: InputMode
  status: JobStatus
  budget: string
  doability: number
  effortHours: string
  redFlags: string[]
  greenFlags: string[]
  notes: string
  messages: ChatMessage[]
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

function generateAIResponse(userMessage: string, conversation: Conversation | null): { text: string; analysis?: { score: number; hours: string; red: string[]; green: string[] } } {
  const text = userMessage.toLowerCase()

  if (text.includes('upwork.com') || text.includes('paste') && text.includes('job')) {
    const analysis = analyzeDoability(userMessage, '')
    return {
      text: `I've analyzed the job post. Here's what I found:\n\n**Doability Score: ${analysis.score}/100**\n\n**Green flags:**\n${analysis.green.map(g => `• ${g}`).join('\n')}\n\n**Red flags:**\n${analysis.red.map(r => `• ${r}`).join('\n')}\n\n**Estimated effort:** ${analysis.hours} hours\n\nWant me to save this to your pipeline?`,
      analysis,
    }
  }

  if (text.includes('save') || text.includes('pipeline')) {
    return { text: 'Saved to your pipeline. I\'ve logged the job with the current analysis. You can find it in the sidebar under your conversations.' }
  }

  if (text.includes('how') && (text.includes('much') || text.includes('charge') || text.includes('price') || text.includes('budget'))) {
    const budget = conversation?.budget || 'not specified'
    return {
      text: `Based on the scope and current market rates:\n\n• **Budget stated:** ${budget}\n• **Recommended rate:** $85-120/hr for this stack\n• **Estimated range:** $${(parseInt(budget.replace(/[^0-9]/g, '')) || 2000).toLocaleString()} - $${((parseInt(budget.replace(/[^0-9]/g, '')) || 2000) * 1.5).toLocaleString()}\n\nThe budget looks ${conversation && conversation.doability > 60 ? 'reasonable' : 'tight'} for this scope.`,
    }
  }

  if (text.includes('should i') || text.includes('worth it') || text.includes('pursue') || text.includes('take')) {
    if (conversation && conversation.doability >= 70) {
      return { text: `**Yes, this looks like a strong opportunity.**\n\n• Doability: ${conversation.doability}/100\n• Effort: ${conversation.effortHours} hours\n• Status: ${STATUS_LABELS[conversation.status]}\n\nThe green flags outweigh the red flags. I'd recommend sending a proposal within the next 2 hours — early applicants get 3x more interviews on Upwork.` }
    }
    if (conversation && conversation.doability >= 50) {
      return { text: `**It's viable but needs careful scoping.**\n\n• Doability: ${conversation.doability}/100\n• Effort: ${conversation.effortHours} hours\n\nMy recommendation: propose a phased approach. Start with a small paid discovery phase ($200-400) to nail down requirements before committing to the full build.` }
    }
    return { text: `**I'd pass on this one.**\n\n• Doability: ${conversation?.doability || 'N/A'}/100\n\nThe red flags outweigh the positives. The scope is unclear and the budget doesn't match the work required. Not worth the time investment.` }
  }

  if (text.includes('proposal') || text.includes('pitch') || text.includes('write')) {
    return {
      text: `Here's a draft proposal:\n\n---\n\nHi,\n\nI've reviewed your project requirements and I'm confident I can deliver exactly what you need.\n\n**My approach:**\n1. Start with architecture review and technical planning\n2. Build core features first with weekly demos\n3. Thorough testing before delivery\n\n**Timeline:** ${conversation?.effortHours || 'TBD'} hours over 2-3 weeks\n**Tech stack:** Based on your requirements, I'd recommend the most efficient approach\n\nI've completed similar projects and can share examples. Let's hop on a quick call to discuss details.\n\nBest regards\n\n---\n\nWant me to adjust the tone or focus?`,
    }
  }

  if (text.includes('risk') || text.includes('concern') || text.includes('warning')) {
    if (conversation) {
      return {
        text: `**Risk Assessment:**\n\n${conversation.redFlags.map(r => `⚠️ ${r}`).join('\n')}\n\n**Mitigation strategies:**\n• Define clear scope boundaries upfront\n• Use fixed-price milestones\n• Require design specs before coding\n• Build in 20% buffer for unknowns\n\nThe biggest risk is scope creep — lock deliverables in writing before starting.`,
      }
    }
    return { text: 'I need more context about the project to assess risks. Can you share the job description or requirements?' }
  }

  if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
    return { text: 'Hey! I\'m your MacroCoder assistant. Paste an Upwork job URL, GitHub repo, or describe a project and I\'ll analyze it for you. I can also help with proposals, pricing, and risk assessment.' }
  }

  if (text.includes('help')) {
    return {
      text: `**What I can help with:**\n\n• **Paste a job URL** — I'll analyze doability, budget fit, and red flags\n• **"Should I pursue this?"** — I'll give a go/no-go recommendation\n• **"Write a proposal"** — I'll draft a client-ready proposal\n• **"How much should I charge?"** — Pricing analysis based on scope\n• **"What are the risks?"** — Risk assessment with mitigation strategies\n• **"Save this"** — Log the job to your pipeline\n\nJust type naturally — I'll figure out what you need.`,
    }
  }

  return {
    text: `I've processed that. Here's my take:\n\nBased on the information available, this looks like a ${conversation && conversation.doability > 60 ? 'solid' : 'moderate'} opportunity. The key factors are scope clarity, budget alignment, and technical fit.\n\nWant me to go deeper on any specific aspect? I can analyze risks, draft a proposal, or help with pricing.`,
  }
}

export function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mc_conversations')
      if (stored) {
        const parsed = JSON.parse(stored)
        setConversations(parsed)
        if (parsed.length > 0) setActiveId(parsed[0].id)
      }
    } catch { /* empty */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('mc_conversations', JSON.stringify(conversations))
    } catch { /* empty */ }
  }, [conversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversations, activeId, isTyping])

  const activeConversation = conversations.find(c => c.id === activeId) || null

  function createConversation() {
    const id = generateId()
    const now = new Date().toISOString()
    const newConv: Conversation = {
      id,
      title: 'New Job',
      client: '',
      source: 'Manual',
      sourceUrl: '',
      mode: 'manual',
      status: 'new',
      budget: '',
      doability: 0,
      effortHours: 'TBD',
      redFlags: [],
      greenFlags: [],
      notes: '',
      messages: [{
        id: generateId(),
        role: 'assistant',
        content: 'Paste an Upwork job URL, GitHub repo, website, or describe a project. I\'ll analyze it and tell you if it\'s worth pursuing.\n\nType **help** to see what I can do.',
        timestamp: now,
      }],
      createdAt: now,
      updatedAt: now,
    }
    setConversations(prev => [newConv, ...prev])
    setActiveId(id)
    inputRef.current?.focus()
  }

  function deleteConversation(id: string) {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) {
      setActiveId(null)
    }
  }

  function updateConversation(id: string, updates: Partial<Conversation>) {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c))
  }

  async function handleSend() {
    if (!input.trim() || !activeId) return

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }

    setConversations(prev => prev.map(c =>
      c.id === activeId
        ? { ...c, messages: [...c.messages, userMsg], updatedAt: new Date().toISOString() }
        : c
    ))

    const currentInput = input
    setInput('')
    setIsTyping(true)

    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))

    const conv = conversations.find(c => c.id === activeId) || null
    const response = generateAIResponse(currentInput, conv)

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: response.text,
      timestamp: new Date().toISOString(),
      analysis: response.analysis,
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== activeId) return c
      const newMessages = [...c.messages, assistantMsg]
      let updates: Partial<Conversation> = { messages: newMessages }

      if (response.analysis) {
        updates = {
          ...updates,
          doability: response.analysis.score,
          effortHours: response.analysis.hours,
          redFlags: response.analysis.red,
          greenFlags: response.analysis.green,
          title: currentInput.slice(0, 60) + (currentInput.length > 60 ? '...' : ''),
        }
      }

      return { ...c, ...updates, updatedAt: new Date().toISOString() }
    }))

    setIsTyping(false)
    if (response.analysis) setShowAnalysis(true)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const filteredConversations = conversations.filter(c =>
    search === '' ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.client.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: conversations.length,
    new: conversations.filter(c => c.status === 'new').length,
    hired: conversations.filter(c => c.status === 'hired').length,
    avgDoability: conversations.length ? Math.round(conversations.reduce((sum, c) => sum + c.doability, 0) / conversations.length) : 0,
  }

  function doabilityColor(score: number) {
    if (score >= 70) return 'text-green-400'
    if (score >= 50) return 'text-yellow-400'
    if (score >= 30) return 'text-orange-400'
    return 'text-red-400'
  }

  function formatTime(ts: string) {
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="h-screen bg-[#1a1714] text-white flex flex-col [font-family:Inter,ui-sans-serif,system-ui,sans-serif]">
      {/* Header */}
      <header className="border-b border-[#3a2a1a] h-[48px] flex items-center px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-3 text-[11px] uppercase tracking-[0.3em] text-[#b09060]">MacroCoder</span>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-[11px] text-[#6a5a4a]">{stats.total} conversations · {stats.hired} hired</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-[280px]' : 'w-0'} border-r border-[#3a2a1a] bg-[#1e1810] flex flex-col flex-shrink-0 transition-all duration-200 overflow-hidden`}>
          {/* New conversation button */}
          <div className="p-3 border-b border-[#3a2a1a]">
            <button
              onClick={createConversation}
              className="w-full flex items-center justify-center gap-2 h-[36px] rounded-lg bg-[#a66e1b] text-[13px] font-medium text-[#1b1106] transition hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" />
              New Job
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-[#3a2a1a]">
            <div className="flex items-center gap-2 rounded-lg border border-[#4a3520] bg-[#251c14] px-3 h-[32px]">
              <Search className="h-3.5 w-3.5 text-[#6a5a4a]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-[12px] text-[#c0a070] outline-none placeholder:text-[#5a4a3a]"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-8 w-8 text-[#4a3a2a] mx-auto mb-2" />
                <p className="text-[12px] text-[#6a5a4a]">No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const ModeIcon = MODE_ICONS[conv.mode]
                const isActive = conv.id === activeId
                const lastMsg = conv.messages[conv.messages.length - 1]
                return (
                  <div
                    key={conv.id}
                    onClick={() => { setActiveId(conv.id); setShowAnalysis(false) }}
                    className={`group flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors border-l-2 ${
                      isActive
                        ? 'bg-[#2a2218] border-[#a66e1b]'
                        : 'border-transparent hover:bg-[#251c14]'
                    }`}
                  >
                    <ModeIcon className="h-3.5 w-3.5 text-[#8b673f] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[13px] truncate ${isActive ? 'text-[#f0ebe5]' : 'text-[#c0a070]'}`}>
                          {conv.title}
                        </span>
                        <span className="text-[10px] text-[#5a4a3a] flex-shrink-0">{formatTime(conv.updatedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border ${STATUS_COLORS[conv.status]}`}>
                          {STATUS_LABELS[conv.status]}
                        </span>
                        {conv.doability > 0 && (
                          <span className={`text-[10px] font-mono ${doabilityColor(conv.doability)}`}>
                            {conv.doability}%
                          </span>
                        )}
                      </div>
                      {lastMsg && (
                        <p className="text-[11px] text-[#6a5a4a] truncate mt-1">
                          {lastMsg.role === 'user' ? 'You: ' : ''}{lastMsg.content}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteConversation(conv.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#5a4a3a] hover:text-red-400 transition flex-shrink-0 mt-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Stats footer */}
          <div className="border-t border-[#3a2a1a] p-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-[16px] font-bold text-[#f0ebe5]">{stats.total}</p>
                <p className="text-[9px] uppercase tracking-wider text-[#6a5a4a]">Total</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-blue-400">{stats.new}</p>
                <p className="text-[9px] uppercase tracking-wider text-[#6a5a4a]">New</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-green-400">{stats.hired}</p>
                <p className="text-[9px] uppercase tracking-wider text-[#6a5a4a]">Hired</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeConversation ? (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Terminal className="h-16 w-16 text-[#3a2a1a] mx-auto mb-4" />
                <p className="text-[20px] text-[#9a8060] mb-2">No conversation selected</p>
                <p className="text-[14px] text-[#6a5a4a] mb-6">Create a new job or select one from the sidebar</p>
                <button
                  onClick={createConversation}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#a66e1b] text-[14px] font-medium text-[#1b1106] px-5 h-[40px] transition hover:brightness-110"
                >
                  <Plus className="h-4 w-4" />
                  New Job
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="border-b border-[#3a2a1a] px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-1 rounded hover:bg-[#2a1e14] text-[#9a8060] transition"
                >
                  {sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-[#f0ebe5] truncate">{activeConversation.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border ${STATUS_COLORS[activeConversation.status]}`}>
                      {STATUS_LABELS[activeConversation.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#6a5a4a]">
                    {activeConversation.client && <span>{activeConversation.client}</span>}
                    {activeConversation.budget && <span>{activeConversation.budget}</span>}
                    {activeConversation.doability > 0 && (
                      <span className={doabilityColor(activeConversation.doability)}>
                        Doability: {activeConversation.doability}% · {activeConversation.effortHours}h
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(['new', 'reviewed', 'pitched', 'hired', 'passed'] as JobStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => updateConversation(activeConversation.id, { status: s })}
                      title={STATUS_LABELS[s]}
                      className={`h-5 w-5 rounded flex items-center justify-center text-[9px] transition ${
                        activeConversation.status === s
                          ? 'bg-[#a66e1b] text-[#1b1106]'
                          : 'bg-[#251c14] text-[#5a4a3a] hover:text-[#9a8060]'
                      }`}
                    >
                      {s[0].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-[800px] mx-auto px-6 py-4">
                  {activeConversation.messages.map(msg => (
                    <div key={msg.id} className={`mb-4 ${msg.role === 'user' ? 'ml-12' : 'mr-12'}`}>
                      <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          msg.role === 'user' ? 'bg-[#a66e1b]' : 'bg-[#2a2218] border border-[#4a3520]'
                        }`}>
                          {msg.role === 'user' ? (
                            <span className="text-[11px] font-bold text-[#1b1106]">Y</span>
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 text-[#e59a1d]" />
                          )}
                        </div>

                        {/* Message bubble */}
                        <div className={`rounded-xl px-4 py-3 max-w-[80%] ${
                          msg.role === 'user'
                            ? 'bg-[#2a2218] border border-[#4a3520]'
                            : 'bg-[#251c14] border border-[#3a2a1a]'
                        }`}>
                          <div className="text-[13px] leading-relaxed text-[#d0c0a0] whitespace-pre-wrap">
                            {msg.content.split('\n').map((line, i) => {
                              if (line.startsWith('**') && line.endsWith('**')) {
                                return <p key={i} className="font-semibold text-[#f0ebe5] my-1">{line.replace(/\*\*/g, '')}</p>
                              }
                              if (line.startsWith('• ') || line.startsWith('- ')) {
                                return <p key={i} className="ml-2 my-0.5">{line}</p>
                              }
                              if (line.startsWith('---')) {
                                return <hr key={i} className="border-[#4a3520] my-2" />
                              }
                              if (line === '') return <br key={i} />
                              return <p key={i} className="my-0.5">{line}</p>
                            })}
                          </div>
                          <p className="text-[10px] text-[#5a4a3a] mt-2">{formatTime(msg.timestamp)}</p>
                        </div>
                      </div>

                      {/* Analysis card */}
                      {msg.analysis && (
                        <div className="mt-3 ml-10 rounded-xl border border-[#4a3520] bg-[#251c14] overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#3a2a1a]">
                            <Zap className="h-4 w-4 text-[#e59a1d]" />
                            <span className="text-[12px] text-[#f0ebe5]">Analysis Result</span>
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="text-center">
                                <p className={`text-[32px] font-bold ${doabilityColor(msg.analysis.score)}`}>{msg.analysis.score}</p>
                                <p className="text-[10px] uppercase tracking-wider text-[#6a5a4a]">Doability</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[20px] font-bold text-[#c0a070]">{msg.analysis.hours}</p>
                                <p className="text-[10px] uppercase tracking-wider text-[#6a5a4a]">Hours</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-green-500/70 mb-1.5">Green Flags</p>
                                {msg.analysis.green.map((f, i) => (
                                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-green-400/80 mb-1">
                                    <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    {f}
                                  </div>
                                ))}
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-red-500/70 mb-1.5">Red Flags</p>
                                {msg.analysis.red.map((f, i) => (
                                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-red-400/80 mb-1">
                                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    {f}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {isTyping && (
                    <div className="mb-4 mr-12">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-[#2a2218] border border-[#4a3520] flex items-center justify-center">
                          <Sparkles className="h-3.5 w-3.5 text-[#e59a1d]" />
                        </div>
                        <div className="rounded-xl px-4 py-3 bg-[#251c14] border border-[#3a2a1a]">
                          <Loader2 className="h-4 w-4 text-[#e59a1d] animate-spin" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input bar */}
              <div className="border-t border-[#3a2a1a] px-4 py-3 flex-shrink-0">
                <div className="max-w-[800px] mx-auto">
                  <div className="flex items-end gap-2 rounded-xl border border-[#4a3520] bg-[#251c14] px-3 py-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Paste a job URL, ask about pricing, or type help..."
                      rows={1}
                      className="flex-1 bg-transparent text-[13px] text-[#d0c0a0] outline-none placeholder:text-[#5a4a3a] resize-none max-h-[120px] [font-family:'JetBrains_Mono',monospace]"
                      style={{ minHeight: '24px' }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping}
                      className="flex-shrink-0 h-8 w-8 rounded-lg bg-[#a66e1b] text-[#1b1106] flex items-center justify-center transition hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-[#4a3a2a] mt-1.5 text-center">
                    MacroCoder AI · Paste URLs for instant analysis · Shift+Enter for new line
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right panel: Analysis (toggleable) */}
        {activeConversation && activeConversation.doability > 0 && showAnalysis && (
          <aside className="w-[300px] border-l border-[#3a2a1a] bg-[#1e1810] flex flex-col flex-shrink-0 overflow-y-auto">
            <div className="p-4 border-b border-[#3a2a1a] flex items-center justify-between">
              <span className="text-[13px] text-[#f0ebe5] font-medium">Job Analysis</span>
              <button onClick={() => setShowAnalysis(false)} className="p-1 rounded hover:bg-[#2a1e14] text-[#6a5a4a]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Score */}
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border ${
                  activeConversation.doability >= 70 ? 'bg-green-500/10 border-green-500/20' :
                  activeConversation.doability >= 50 ? 'bg-yellow-500/10 border-yellow-500/20' :
                  'bg-red-500/10 border-red-500/20'
                }`}>
                  <span className={`text-[36px] font-bold ${doabilityColor(activeConversation.doability)}`}>
                    {activeConversation.doability}
                  </span>
                  <span className={`text-[16px] ${doabilityColor(activeConversation.doability)}`}>/100</span>
                </div>
                <p className="mt-2 text-[12px] text-[#9a8060]">
                  Estimated: <span className="text-[#c0a070] font-mono">{activeConversation.effortHours} hours</span>
                </p>
              </div>

              {/* Source */}
              {activeConversation.sourceUrl && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#6a5a4a] mb-1">Source</p>
                  <a
                    href={activeConversation.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[12px] text-[#e59a1d] hover:underline"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    {activeConversation.sourceUrl}
                  </a>
                </div>
              )}

              {/* Green flags */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-green-500/70 mb-2">Green Flags</p>
                {activeConversation.greenFlags.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-green-400/80 mb-1.5">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              {/* Red flags */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-red-500/70 mb-2">Red Flags</p>
                {activeConversation.redFlags.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-red-400/80 mb-1.5">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#6a5a4a] mb-1">Notes</p>
                <textarea
                  value={activeConversation.notes}
                  onChange={e => updateConversation(activeConversation.id, { notes: e.target.value })}
                  placeholder="Add notes..."
                  rows={3}
                  className="w-full rounded-lg border border-[#4a3520] bg-[#251c14] px-3 py-2 text-[12px] text-[#c0a070] outline-none placeholder:text-[#5a4a3a] resize-none"
                />
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
