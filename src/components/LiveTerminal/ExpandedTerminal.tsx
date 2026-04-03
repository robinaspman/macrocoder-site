import { useState } from 'react'
import { TerminalPanel } from './TerminalPanel'
import { TERMINAL_SESSIONS, ACTIVITY_LOG, JOURNAL_ENTRIES } from './terminalData'

export function ExpandedTerminal({
  sessionId,
  onClose,
  onSwitch,
}: {
  sessionId: string
  onClose: () => void
  onSwitch: (id: string) => void
}) {
  const session = TERMINAL_SESSIONS.find(s => s.id === sessionId)
  const [activeTab, setActiveTab] = useState<'journal' | 'activity'>('journal')

  if (!session) return null

  return (
    <div className="fixed inset-0 z-50 bg-[#0a1214] flex flex-col">
      {/* Top bar */}
      <div className="h-[48px] flex items-center justify-between px-6 border-b border-[#1e2e2e] flex-shrink-0">
        <button
          onClick={onClose}
          className="text-[12px] text-[#5a7a7a] hover:text-[#d0dede] transition-colors flex items-center gap-1"
        >
          &larr; BACK
        </button>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#e0a040]" />
          <span className="text-[12px] uppercase tracking-[0.2em] text-[#e0a040] font-semibold">
            MACROCODER
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-green-400 font-medium">LIVE</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Terminal section */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Back-to link */}
          <button
            onClick={onClose}
            className="text-[11px] text-[#e0a040] hover:text-[#f0b050] transition-colors mb-3 self-start"
          >
            &larr; Back to {session.icon} {session.mode}
          </button>

          {/* Terminal */}
          <div className="flex-1 min-h-0">
            <TerminalPanel session={session} />
          </div>
        </div>

        {/* Right sidebar with tabs */}
        <div className="w-[320px] border-l border-[#1e2e2e] bg-[#0e1a1c] flex flex-col flex-shrink-0">
          {/* Tab headers */}
          <div className="flex border-b border-[#1e2e2e]">
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex-1 py-3 text-[11px] uppercase tracking-wider font-medium transition-colors ${
                activeTab === 'journal'
                  ? 'text-[#e0a040] border-b-2 border-[#e0a040]'
                  : 'text-[#5a7a7a] hover:text-[#8aaa9a]'
              }`}
            >
              // Journal
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-3 text-[11px] uppercase tracking-wider font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'text-[#e0a040] border-b-2 border-[#e0a040]'
                  : 'text-[#5a7a7a] hover:text-[#8aaa9a]'
              }`}
            >
              Activity
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'journal' ? (
              <JournalTab />
            ) : (
              <ActivityTab onSwitch={onSwitch} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function JournalTab() {
  return (
    <div>
      <p className="text-[11px] text-[#5a7a7a] font-mono mb-4">// journal</p>
      <div className="space-y-6">
        {JOURNAL_ENTRIES.map((entry, i) => (
          <div key={i} className="relative">
            {/* Day marker */}
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-[#e0a040]" />
              <span className="text-[11px] text-[#e0a040] font-medium">
                Day {entry.day}
              </span>
              <span className="text-[10px] text-[#4a6a6a]">{entry.time}</span>
            </div>

            {/* Entry content */}
            <div className="ml-4">
              <p className="text-[13px] text-[#d0dede] font-semibold leading-snug mb-1">
                {entry.title}
              </p>
              <p className="text-[11px] text-[#6a8a8a] leading-relaxed [font-family:'JetBrains_Mono',monospace]">
                {entry.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityTab({ onSwitch }: { onSwitch: (id: string) => void }) {
  return (
    <div>
      <p className="text-[11px] text-[#5a7a7a] uppercase tracking-wider mb-4">Activity Log</p>
      <div className="space-y-2">
        {ACTIVITY_LOG.map((entry, i) => (
          <button
            key={i}
            onClick={() => onSwitch(entry.sessionId)}
            className={`flex items-start gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors cursor-pointer hover:bg-[#142020] ${
              i === 0 ? 'bg-[#142020] border border-[#1e2e2e]' : ''
            }`}
          >
            <span className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
              entry.status === 'done' ? 'bg-green-500' : 'bg-green-400 animate-pulse'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[#d0dede] leading-snug">{entry.event}</p>
              <p className="text-[10px] text-[#4a6a6a] mt-0.5">{entry.time}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
