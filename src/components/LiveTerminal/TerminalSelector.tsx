import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import type { TerminalSession } from './terminalData'

export function TerminalSelector({
  sessions,
  visibleIds,
  onChange,
}: {
  sessions: TerminalSession[]
  visibleIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  console.log('[Selector] Render, sessions length:', sessions.length, 'visibleIds:', visibleIds)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleSession(id: string) {
    console.log('[Selector] toggleSession:', id, 'current:', visibleIds)
    if (visibleIds.includes(id)) {
      if (visibleIds.length > 1) {
        const newIds = visibleIds.filter(v => v !== id)
        console.log('[Selector] Setting visibleIds:', newIds)
        onChange(newIds)
      }
    } else {
      const newIds = [...visibleIds, id]
      console.log('[Selector] Setting visibleIds:', newIds)
      onChange(newIds)
    }
  }

  function setCount(n: number) {
    const sessionIds = sessions.slice(0, n).map(s => s.id)
    console.log('[Selector] sessions slice(0,', n, '):', sessionIds)
    console.log('[Selector] sessions total:', sessions.length)
    console.log('[Selector] Setting visibleIds:', sessionIds)
    onChange(sessionIds)
  }

  const count = visibleIds.length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#142020] border border-[#1e2e2e] text-[#8aaa9a] hover:text-[#d0dede] hover:border-[#e0a040]/30 transition-colors"
      >
        <span className="text-[11px] font-medium">{count} terminal{count !== 1 ? 's' : ''}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-[280px] bg-[#0e1a1c] border border-[#1e2e2e] rounded-lg shadow-xl shadow-black/50 z-50 overflow-hidden">
          {/* Quick count buttons */}
          <div className="px-3 py-2 border-b border-[#1e2e2e]">
            <p className="text-[9px] uppercase tracking-wider text-[#4a6a6a] mb-1.5">Show</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`flex-1 h-6 rounded text-[10px] font-medium transition-colors ${
                    count === n
                      ? 'bg-[#e0a040] text-[#0a1214]'
                      : 'bg-[#142020] text-[#6a8a8a] hover:text-[#d0dede]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Individual toggles */}
          <div className="p-2">
            <p className="text-[9px] uppercase tracking-wider text-[#4a6a6a] mb-1.5 px-1">Active</p>
            {sessions.map(session => {
              const isActive = visibleIds.includes(session.id)
              return (
                <button
                  key={session.id}
                  onClick={() => toggleSession(session.id)}
                  className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded hover:bg-[#142020] transition-colors"
                >
                  <div className={`h-3.5 w-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-[#e0a040]' : 'bg-[#1e2e2e]'
                  }`}>
                    {isActive && <Check className="h-2.5 w-2.5 text-[#0a1214]" />}
                  </div>
                  <span className="text-[12px]" style={{ color: session.color }}>{session.icon}</span>
                  <div className="flex-1 text-left min-w-0">
                    <p className={`text-[11px] font-medium truncate ${isActive ? 'text-[#d0dede]' : 'text-[#5a7a7a]'}`}>
                      {session.mode}
                    </p>
                    <p className="text-[9px] text-[#4a6a6a] truncate">{session.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
