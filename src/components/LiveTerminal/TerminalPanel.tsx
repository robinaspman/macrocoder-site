import { useState, useEffect, useRef } from 'react'
import type { TerminalSession, TerminalLine } from './terminalData'
import { TERMINAL_SESSIONS } from './terminalData'

const LINE_COLORS: Record<string, string> = {
  command: '#e59a1d',
  output: '#a09880',
  error: '#ef4444',
  success: '#22c55e',
  info: '#60a5fa',
  warning: '#f59e0b',
  credential: '#f97316',
}

function TerminalText({ line }: { line: TerminalLine }) {
  if (line.type === 'credential') {
    const parts = line.text.split(/(sk-[a-zA-Z0-9]+|AKIA[A-Z0-9]+|[a-f0-9]{32,})/g)
    return (
      <span>
        {parts.map((part, i) => {
          if (part.match(/^(sk-|AKIA|[a-f0-9]{32,})$/)) {
            const redacted = part.slice(0, 6) + '█'.repeat(Math.min(part.length - 6, 24))
            return (
              <span key={i} className="bg-orange-500/20 text-orange-400 px-0.5 rounded">
                {redacted}
              </span>
            )
          }
          return <span key={i} style={{ color: LINE_COLORS[line.type] }}>{part}</span>
        })}
      </span>
    )
  }

  if (line.type === 'command') {
    const dollarIdx = line.text.indexOf('$')
    if (dollarIdx >= 0) {
      return (
        <span>
          <span className="text-green-400">{line.text.slice(0, dollarIdx + 1)}</span>
          <span style={{ color: '#fff' }}>{line.text.slice(dollarIdx + 1)}</span>
        </span>
      )
    }
  }

  return <span style={{ color: LINE_COLORS[line.type] }}>{line.text}</span>
}

export function TerminalPanel({
  session,
  onClick,
  compact = false,
}: {
  session: TerminalSession
  onClick?: () => void
  compact?: boolean
}) {
  const [visibleLines, setVisibleLines] = useState<TerminalLine[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [showCursor, setShowCursor] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    setVisibleLines([])
    setIsComplete(false)
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []

    let cumulativeDelay = 0
    session.lines.forEach((line, i) => {
      cumulativeDelay += line.delay
      const timeout = window.setTimeout(() => {
        setVisibleLines(prev => [...prev, line])
        if (i === session.lines.length - 1) {
          setIsComplete(true)
        }
      }, cumulativeDelay)
      timeoutsRef.current.push(timeout)
    })

    return () => {
      timeoutsRef.current.forEach(clearTimeout)
    }
  }, [session])

  useEffect(() => {
    const interval = setInterval(() => setShowCursor(p => !p), 530)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [visibleLines])

  const statusColor = isComplete ? 'bg-green-500' : 'bg-green-400 animate-pulse'

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="bg-[#1a1510] rounded-xl border border-[#3a2a1a] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[#a66e1b]/50 hover:shadow-lg hover:shadow-[#a66e1b]/5 group"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a1e14]">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: session.color }}>
              {session.mode}
            </span>
          </div>
          <span className="text-[10px] text-[#5a4a3a] font-mono">{session.command.slice(0, 30)}...</span>
        </div>

        {/* Terminal content */}
        <div ref={scrollRef} className="p-3 h-[140px] overflow-y-auto [font-family:'JetBrains_Mono',monospace] text-[11px] leading-relaxed scrollbar-thin">
          {visibleLines.map((line, i) => (
            <div key={i} className="whitespace-pre">
              <TerminalText line={line} />
            </div>
          ))}
          {!isComplete && (
            <span className={`inline-block w-2 h-4 ${showCursor ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: LINE_COLORS.command }} />
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-[#2a1e14] flex items-center justify-between">
          <span className="text-[9px] text-[#5a4a3a] uppercase tracking-wider">
            {visibleLines.length}/{session.lines.length} lines
          </span>
          <span className="text-[9px] text-[#5a4a3a] opacity-0 group-hover:opacity-100 transition-opacity">
            Click to expand →
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1510] rounded-xl border border-[#3a2a1a] overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a1e14]">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
          <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: session.color }}>
            {session.mode}
          </span>
          <span className="text-[11px] text-[#5a4a3a] font-mono">{session.command}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#5a4a3a] font-mono">
            {visibleLines.length}/{session.lines.length} lines
          </span>
        </div>
      </div>

      {/* Terminal content */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto [font-family:'JetBrains_Mono',monospace] text-[12px] leading-relaxed">
        {visibleLines.map((line, i) => (
          <div key={i} className="whitespace-pre">
            <TerminalText line={line} />
          </div>
        ))}
        {!isComplete && (
          <span className={`inline-block w-2 h-4 ${showCursor ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: LINE_COLORS.command }} />
        )}
      </div>
    </div>
  )
}

export function TerminalGrid({ onExpand }: { onExpand: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {TERMINAL_SESSIONS.map(session => (
        <TerminalPanel
          key={session.id}
          session={session}
          onClick={() => onExpand(session.id)}
          compact
        />
      ))}
    </div>
  )
}
