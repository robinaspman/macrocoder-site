import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TerminalGrid } from './TerminalPanel'
import { StatsSidebar } from './StatsSidebar'
import { ExpandedTerminal } from './ExpandedTerminal'
import { TerminalSelector } from './TerminalSelector'
import { TERMINAL_SESSIONS } from './terminalData'

export function LiveTerminalDashboard() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [visibleIds, setVisibleIds] = useState<string[]>(TERMINAL_SESSIONS.map(s => s.id))

  const visibleSessions = TERMINAL_SESSIONS.filter(s => visibleIds.includes(s.id))

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
            sessions={TERMINAL_SESSIONS}
            visibleIds={visibleIds}
            onChange={setVisibleIds}
          />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-[11px] text-[#5a7a7a]">
            1 agent · {visibleIds.length} mode{visibleIds.length !== 1 ? 's' : ''} · Working live
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Terminal area */}
        <div className="flex-1 flex flex-col p-8">
          <div className="max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0">
            {/* Hero text */}
            <div className="mb-6 flex-shrink-0">
              <h1 className="text-[40px] font-bold leading-tight">
                <span className="text-[#e0a040]">1 agent.</span>{' '}
                <span className="text-white">Working live.</span>
              </h1>
              <p className="text-[#5a7a7a] text-[15px] mt-2">
                Click any terminal to watch the full sequence.
              </p>
            </div>

            <div className="flex-1 min-h-0">
              <TerminalGrid sessions={visibleSessions} onExpand={setExpandedId} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-6 flex-shrink-0 text-[10px] uppercase tracking-wider text-[#3a5050]">
              <span>&copy; 2026 MACROCODER</span>
              <span>{visibleIds.length} SEQUENCE{visibleIds.length !== 1 ? 'S' : ''} · &infin; LOOP</span>
            </div>
          </div>
        </div>

        {/* Activity log sidebar */}
        <div className={`${sidebarOpen ? 'w-[280px]' : 'w-0'} transition-all duration-200 overflow-hidden flex-shrink-0`}>
          <StatsSidebar onExpand={setExpandedId} />
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
