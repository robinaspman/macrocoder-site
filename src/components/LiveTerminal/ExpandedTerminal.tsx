import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(null)

  if (!session) return null

  if (expandedJournalId) {
    const entry = JOURNAL_ENTRIES.find(e => e.id === expandedJournalId)
    if (entry) {
      return (
        <JournalExpandedView
          entry={entry}
          onClose={() => setExpandedJournalId(null)}
        />
      )
    }
  }

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
          <button
            onClick={onClose}
            className="text-[11px] text-[#e0a040] hover:text-[#f0b050] transition-colors mb-3 self-start"
          >
            &larr; Back to {session.icon} {session.mode}
          </button>

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
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeTab === 'journal' ? (
              <div className="p-4">
                <p className="text-[11px] text-[#5a7a7a] font-mono mb-4">// journal</p>
                <div className="space-y-4">
                  {JOURNAL_ENTRIES.map((entry) => (
                    <JournalEntry
                      key={entry.id}
                      entry={entry}
                      onSelect={() => setExpandedJournalId(entry.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-[11px] text-[#5a7a7a] uppercase tracking-wider mb-3">Activity Log</p>
                <div className="space-y-1.5">
                  {ACTIVITY_LOG.map((entry) => (
                    <button
                      key={entry.sessionId}
                      onClick={() => onSwitch(entry.sessionId)}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors cursor-pointer hover:bg-[#142020] ${
                        entry.sessionId === sessionId ? 'bg-[#142020] border border-[#1e2e2e]' : ''
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function JournalEntry({
  entry,
  onSelect,
}: {
  entry: { id: string; day: number; time: string; title: string; body: string }
  onSelect: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) onSelect() }}
        className="w-full text-left"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="h-2 w-2 rounded-full bg-[#e0a040]" />
          <span className="text-[11px] text-[#e0a040] font-medium">Day {entry.day}</span>
          <span className="text-[10px] text-[#4a6a6a]">{entry.time}</span>
          {open ? (
            <ChevronUp className="h-3 w-3 text-[#4a6a6a] ml-auto" />
          ) : (
            <ChevronDown className="h-3 w-3 text-[#4a6a6a] ml-auto" />
          )}
        </div>
        <p className="text-[12px] text-[#d0dede] font-semibold leading-snug mb-1 ml-4">
          {entry.title}
        </p>
        <p className="text-[10px] text-[#6a8a8a] leading-relaxed ml-4 line-clamp-2">
          {entry.body}
        </p>
      </button>
    </div>
  )
}

function JournalExpandedView({
  entry,
  onClose,
}: {
  entry: { id: string; day: number; time: string; title: string; body: string; expandedThought: string }
  onClose: () => void
}) {
  const lines = entry.expandedThought.split('\n')

  return (
    <div className="fixed inset-0 z-50 bg-[#0a1214] flex flex-col">
      <div className="h-[48px] flex items-center justify-between px-6 border-b border-[#1e2e2e] flex-shrink-0">
        <button
          onClick={onClose}
          className="text-[12px] text-[#5a7a7a] hover:text-[#d0dede] transition-colors flex items-center gap-1"
        >
          &larr; BACK TO JOURNAL
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

      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="mb-4">
          <p className="text-[11px] text-[#e0a040] font-mono">// thought process — Day {entry.day} {entry.time}</p>
          <p className="text-[14px] text-[#d0dede] font-semibold mt-1">{entry.title}</p>
        </div>

        <div className="flex-1 bg-[#111a1a] rounded-lg border border-[#1e2e2e] p-4 overflow-y-auto [font-family:'JetBrains_Mono',monospace] text-[12px] leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {lines.map((line, i) => {
            const hasCensored = line.includes('████') || line.includes('[REDACTED]')
            return (
              <div
                key={i}
                className="whitespace-pre mb-1"
                style={{
                  color: hasCensored ? '#4a6a6a' : line.startsWith('//') ? '#5a7a7a' : '#8aaa9a',
                }}
              >
                {line}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
