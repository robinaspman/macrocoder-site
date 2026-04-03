import { useEffect, useRef, useState } from 'react'
import { ACTIVITY_LOG } from './terminalData'

export function StatsSidebar({ onExpand }: { onExpand: (id: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [sortedLog, setSortedLog] = useState(ACTIVITY_LOG)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedId) {
      // Reorder: put selected at top
      const selected = sortedLog.find(e => e.sessionId === selectedId)
      if (selected) {
        const reordered = [
          selected,
          ...sortedLog.filter(e => e.sessionId !== selectedId),
        ]
        setSortedLog(reordered)
      }
    } else {
      // Reset to original order
      setSortedLog(ACTIVITY_LOG)
    }
  }, [selectedId])

  const handleClick = (sessionId: string) => {
    setSelectedId(sessionId)
    onExpand(sessionId)
  }

  return (
    <div className="w-[280px] border-l border-[#1e2e2e] bg-[#0e1a1c] flex flex-col flex-shrink-0">
      <div className="px-4 py-3 border-b border-[#1e2e2e]">
        <p className="text-[10px] uppercase tracking-wider text-[#5a7a7a]">Activity Log</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="space-y-2">
          {sortedLog.map((entry, i) => (
            <button
              key={entry.sessionId + i}
              onClick={() => handleClick(entry.sessionId)}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors cursor-pointer hover:bg-[#142020] ${
                selectedId === entry.sessionId ? 'bg-[#142020] border border-[#1e2e2e]' : ''
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
    </div>
  )
}
