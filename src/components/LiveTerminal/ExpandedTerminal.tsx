import { X, Terminal, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { TerminalPanel } from './TerminalPanel'
import { TERMINAL_SESSIONS, ACTIVITY_LOG } from './terminalData'

export function ExpandedTerminal({
  sessionId,
  onClose,
}: {
  sessionId: string
  onClose: () => void
}) {
  const session = TERMINAL_SESSIONS.find(s => s.id === sessionId)
  if (!session) return null

  const sessionLogs = ACTIVITY_LOG.filter(
    log => log.detail.toLowerCase().includes(session.mode.toLowerCase()) ||
           log.event.toLowerCase().includes(session.id)
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8" onClick={onClose}>
      <div
        className="w-full max-w-5xl h-[80vh] bg-[#1a1510] rounded-2xl border border-[#3a2a1a] overflow-hidden flex flex-col shadow-2xl shadow-black/50"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a1e14]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex items-center gap-3">
              <Terminal className="h-4 w-4" style={{ color: session.color }} />
              <span className="text-[14px] font-semibold uppercase tracking-wider" style={{ color: session.color }}>
                {session.mode}
              </span>
              <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                LIVE
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[#5a4a3a] font-mono">{session.command}</span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#2a1e14] text-[#6a5a4a] hover:text-[#c0a070] transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Terminal */}
          <div className="flex-1 p-4">
            <TerminalPanel session={session} />
          </div>

          {/* Activity sidebar */}
          <div className="w-[260px] border-l border-[#2a1e14] bg-[#15100a] p-4 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-[#6a5a4a] mb-4">Session Activity</p>

            <div className="space-y-4">
              {/* Session stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#251c14] rounded-lg p-3 border border-[#3a2a1a]">
                  <p className="text-[16px] font-bold text-[#c0a070]">{session.lines.length}</p>
                  <p className="text-[9px] uppercase tracking-wider text-[#5a4a3a]">Total Lines</p>
                </div>
                <div className="bg-[#251c14] rounded-lg p-3 border border-[#3a2a1a]">
                  <p className="text-[16px] font-bold text-green-400">
                    {session.lines.filter(l => l.type === 'success').length}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-[#5a4a3a]">Successes</p>
                </div>
                <div className="bg-[#251c14] rounded-lg p-3 border border-[#3a2a1a]">
                  <p className="text-[16px] font-bold text-blue-400">
                    {session.lines.filter(l => l.type === 'command').length}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-[#5a4a3a]">Commands</p>
                </div>
                <div className="bg-[#251c14] rounded-lg p-3 border border-[#3a2a1a]">
                  <p className="text-[16px] font-bold text-orange-400">
                    {session.lines.filter(l => l.type === 'warning' || l.type === 'error').length}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-[#5a4a3a]">Issues</p>
                </div>
              </div>

              {/* Activity log */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#6a5a4a] mb-2">Related Events</p>
                <div className="space-y-2">
                  {sessionLogs.length > 0 ? sessionLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {log.status === 'done' ? (
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] text-[#c0a070] truncate">{log.event}</p>
                        <div className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 text-[#5a4a3a]" />
                          <span className="text-[9px] text-[#5a4a3a] font-mono">{log.time}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-[11px] text-[#5a4a3a]">No specific events logged</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
