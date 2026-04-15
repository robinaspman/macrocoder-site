import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react'
import { TerminalGrid } from './TerminalPanel'
import { StatsSidebar } from './StatsSidebar'
import { ExpandedTerminal } from './ExpandedTerminal'
import { TerminalSelector } from './TerminalSelector'
import { TERMINAL_SESSIONS, ACTIVITY_LOG } from './terminalData'
import type { TerminalLine } from './terminalData'

interface Session {
  id: string
  mode: string
  icon: string
  status: string
  command: string
  color: string
  description: string
  lines?: TerminalLine[]
}

interface Activity {
  time: string
  event: string
  detail: string
  status: string
  sessionId: string
}

export function LiveTerminalDashboard() {
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [visibleIds, setVisibleIds] = useState<string[]>([])

  useEffect(() => {
    // Always use demo data when no API configured
    const demo = TERMINAL_SESSIONS.map((s) => ({
      id: s.id,
      mode: s.mode,
      icon: s.icon,
      status: s.status,
      command: s.command,
      color: s.color,
      description: s.description
    }))
    setSessions(demo)
    setVisibleIds(demo.map((s: Session) => s.id))
    // Use activity from demo data
    const activityData = ACTIVITY_LOG.slice(0, 15).map((a) => ({
      time: a.time,
      event: a.event,
      detail: a.detail,
      status: a.status,
      sessionId: a.sessionId
    }))
    setActivity(activityData)
  }, [])

  const visibleSessions = sessions.filter((s) => visibleIds.includes(s.id))

  const terminalSessions = visibleSessions.map((s) => {
    const demoSession = TERMINAL_SESSIONS.find((ds) => ds.id === s.id)
    return {
      ...s,
      status: s.status as 'running' | 'completed' | 'idle',
      lines: demoSession?.lines || []
    }
  })

  return (
    <div className="h-screen bg-[#0a1214] text-white flex flex-col [font-family:Inter,ui-sans-serif,system-ui,sans-serif]">
      {/* Header */}
      <header className="border-b border-[#1e2e2e] h-[56px] flex items-center px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[13px] uppercase tracking-[0.2em] text-[#e0a040] font-semibold">
            MacroCoder
          </span>
        </div>
        <div className="ml-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-green-400 font-medium">ALL SYSTEMS OPERATIONAL</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
            LIVE
          </span>
          <TerminalSelector
            sessions={sessions as any}
            visibleIds={visibleIds}
            onChange={setVisibleIds}
          />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/analytics')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1e2e2e] hover:bg-[#2a3a3a] text-[11px] text-[#e0a040] font-medium uppercase tracking-wider transition-colors cursor-pointer"
          >
            <BarChart3 className="h-3 w-3" />
            Analytics
          </button>
          <span className="text-[11px] text-[#5a7a7a]">
            1 agent · {visibleIds.length} mode{visibleIds.length !== 1 ? 's' : ''} · Demo data
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Terminal area */}
        <div className="flex-1 flex flex-col p-8">
          <div className="max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0">
            {/* Hero text */}
            <div className="mb-6 flex-shrink-0 max-w-[720px]">
              <h1 className="text-[32px] font-bold leading-tight tracking-tight">
                <span
                  className="text-[#d4a020]"
                  style={{
                    textShadow: '0 0 20px rgba(212, 160, 32, 0.6), 0 0 40px rgba(212, 160, 32, 0.3)'
                  }}
                >
                  MacroCoder.
                </span>{' '}
                <span className="text-white">Multiple Agents. Real Execution.</span>
              </h1>
              <p className="text-[#8aaa9a] text-[14px] mt-3 font-medium">
                Private cloud-connected agent orchestration for build, deploy, debugging, migration,
                security, and optimization.
              </p>
              <p className="text-[#3a5050] text-[11px] mt-3 leading-relaxed">
                This website showcases demo content. For privacy reasons, I do not disclose whether
                any displayed material is connected to client work.
              </p>
            </div>

            <div className="flex-1 min-h-0">
              <TerminalGrid sessions={terminalSessions} onExpand={setExpandedId} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-6 flex-shrink-0 text-[10px] uppercase tracking-wider text-[#3a5050]">
              <span>&copy; 2026 MACROCODER · Demo Only · No Client Code</span>
              <span>
                {visibleIds.length} SEQUENCE{visibleIds.length !== 1 ? 'S' : ''} ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Activity log sidebar */}
        <div
          className={`${sidebarOpen ? 'w-[280px]' : 'w-0'} transition-all duration-200 overflow-hidden flex-shrink-0 min-h-0`}
        >
          <StatsSidebar onExpand={setExpandedId} activity={activity} />
        </div>

        {/* Chevron toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-4 border-l border-[#1e2e2e] bg-[#0e1a1c] flex items-center justify-center hover:bg-[#142020] transition-colors flex-shrink-0"
        >
          {sidebarOpen ? (
            <ChevronRight className="h-3 w-3 text-[#3a5050]" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-[#3a5050]" />
          )}
        </button>
      </div>

      {/* Expanded terminal modal */}
      {expandedId && (
        <ExpandedTerminal
          sessionId={expandedId}
          onClose={() => setExpandedId(null)}
          onSwitch={setExpandedId}
        />
      )}
    </div>
  )
}
