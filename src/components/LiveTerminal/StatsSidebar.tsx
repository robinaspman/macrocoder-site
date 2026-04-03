import { useEffect, useRef } from 'react'
import { ACTIVITY_LOG } from './terminalData'

export function StatsSidebar() {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  return (
    <div className="w-[280px] border-l border-[#3a2a1a] bg-[#1e1810] flex flex-col flex-shrink-0">
      <div className="px-4 py-3 border-b border-[#3a2a1a]">
        <p className="text-[10px] uppercase tracking-wider text-[#6a5a4a]">Activity Log</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="space-y-2">
          {ACTIVITY_LOG.map((entry, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[9px] text-[#5a4a3a] font-mono mt-0.5">{entry.time}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#c0a070] truncate">{entry.event}</p>
                <p className="text-[10px] text-[#5a4a3a] truncate">{entry.detail}</p>
              </div>
              <span className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                entry.status === 'done' ? 'bg-green-500' : 'bg-green-400 animate-pulse'
              }`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
