import { useState, useEffect, useRef } from 'react'
import type { TerminalSession, TerminalLine } from './terminalData'

const LINE_COLORS: Record<string, string> = {
  command: '#e59a1d',
  output: '#a09880',
  error: '#ef4444',
  success: '#22c55e',
  info: '#60a5fa',
  warning: '#f59e0b',
  credential: '#f97316',
  censored: '#6a8a8a',
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

export { TerminalText, LINE_COLORS }

export function TerminalPanel({
  session,
  onClick,
  compact = false,
  expanded = false,
}: {
  session: TerminalSession
  onClick?: () => void
  compact?: boolean
  expanded?: boolean
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

    const startAnimation = () => {
      let cumulativeDelay = 0
      session.lines.forEach((line, i) => {
        cumulativeDelay += line.delay
        const timeout = window.setTimeout(() => {
          setVisibleLines(prev => [...prev, line])
          if (i === session.lines.length - 1) {
            setIsComplete(true)
            // Loop animation after a delay
            const loopTimeout = window.setTimeout(() => {
              startAnimation()
            }, 3000)
            timeoutsRef.current.push(loopTimeout)
          }
        }, cumulativeDelay)
        timeoutsRef.current.push(timeout)
      })
    }

    startAnimation()

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
        className="bg-[#111a1a] rounded-lg border border-[#1e2e2e] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[#e0a040]/50 hover:shadow-lg hover:shadow-[#e0a040]/10 group flex flex-col"
      >
        {/* Header bar with traffic lights */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e2e2e]">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
              <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
              <span className="h-2 w-2 rounded-full bg-[#28c840]" />
            </div>
            <span className="text-[10px] opacity-60">{session.icon}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: session.color }}>
              {session.mode}
            </span>
          </div>
          <span className={`h-2 w-2 rounded-full ${statusColor}`} />
        </div>

        {/* Terminal content */}
        <div ref={scrollRef} className={`p-3 overflow-y-auto [font-family:'JetBrains_Mono',monospace] text-[11px] leading-relaxed scrollbar-thin ${expanded ? 'h-[400px]' : 'h-[160px]'}`}>
          {visibleLines.map((line, i) => (
            <div key={i} className="whitespace-pre">
              <TerminalText line={line} />
            </div>
          ))}
          <span className={`inline-block w-2 h-4 ${showCursor ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: LINE_COLORS.command }} />
        </div>

        {/* Footer description */}
        <div className="px-3 py-2 border-t border-[#1e2e2e] mt-auto">
          <span className="text-[11px] text-[#6a7a7a]">
            {session.description}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#111a1a] rounded-lg border border-[#1e2e2e] overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e2e2e]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[10px]">{session.icon}</span>
          <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: session.color }}>
            AGENT: {session.mode}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusColor}`} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: isComplete ? '#6b7280' : '#22c55e' }}>
            {isComplete ? 'DONE' : 'LIVE'}
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
        <span className={`inline-block w-2 h-4 ${showCursor ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: LINE_COLORS.command }} />
      </div>
    </div>
  )
}

export function TerminalGrid({ sessions, onExpand }: { sessions: TerminalSession[]; onExpand: (id: string) => void }) {
  const count = sessions.length
  const gridClass = count === 1
    ? 'grid-cols-1'
    : count === 2
    ? 'grid-cols-2'
    : count <= 4
    ? 'grid-cols-2'
    : 'grid-cols-3'

  return (
    <div className={`grid ${gridClass} gap-4 h-full`}>
      {sessions.map(session => (
        <TerminalPanel
          key={session.id}
          session={session}
          onClick={() => onExpand(session.id)}
          compact
          expanded={count <= 2}
        />
      ))}
    </div>
  )
}
