interface ActivityEntry {
  time: string
  event: string
  detail: string
  status: string
  sessionId: string
}

export function StatsSidebar({ 
  onExpand, 
  activity = [] 
}: { 
  onExpand: (id: string) => void
  activity?: ActivityEntry[]
}) {
  const entries = activity.length > 0 ? activity : []

  return (
    <div className="w-[280px] h-[calc(100vh-56px)] border-l border-[#1e2e2e] bg-[#0e1a1c] flex flex-col flex-shrink-0">
      <div className="px-4 py-3 border-b border-[#1e2e2e] flex-shrink-0">
        <p className="text-[10px] uppercase tracking-wider text-[#5a7a7a]">Activity Log</p>
      </div>
      <div className="h-[320px] p-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-1.5">
          {entries.map((entry, i) => (
            <button
              key={entry.sessionId + i}
              onClick={() => onExpand(entry.sessionId)}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors cursor-pointer hover:bg-[#142020]"
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