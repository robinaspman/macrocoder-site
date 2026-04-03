import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TerminalGrid } from './TerminalPanel'
import { StatsSidebar } from './StatsSidebar'
import { ExpandedTerminal } from './ExpandedTerminal'

export function LiveTerminalDashboard() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="h-screen bg-[#050403] text-white flex flex-col [font-family:Inter,ui-sans-serif,system-ui,sans-serif]">
      {/* Header */}
      <header className="border-b border-[#3a2a1a] h-[56px] flex items-center px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[13px] uppercase tracking-[0.2em] text-[#c0a880] font-semibold">
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
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-[11px] text-[#9a8a70]">
            1 agent · 6 modes · Working live
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Terminal grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1400px] mx-auto">
            <TerminalGrid onExpand={setExpandedId} />
          </div>
        </div>

        {/* Activity log sidebar */}
        <div className={`${sidebarOpen ? 'w-[280px]' : 'w-0'} transition-all duration-200 overflow-hidden flex-shrink-0`}>
          <StatsSidebar />
        </div>

        {/* Chevron toggle button (far right edge) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-4 border-l border-[#3a2a1a] bg-[#1e1810] flex items-center justify-center hover:bg-[#2a1e14] transition-colors flex-shrink-0"
        >
          {sidebarOpen ? (
            <ChevronRight className="h-3 w-3 text-[#6a5a4a]" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-[#6a5a4a]" />
          )}
        </button>
      </div>

      {/* Expanded terminal modal */}
      {expandedId && (
        <ExpandedTerminal
          sessionId={expandedId}
          onClose={() => setExpandedId(null)}
        />
      )}
    </div>
  )
}
