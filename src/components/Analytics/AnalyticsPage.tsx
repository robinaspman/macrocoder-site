import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ArrowLeft, RefreshCw, Activity, Shield, DollarSign, TrendingUp,
  Cpu, Swords, Zap, AlertTriangle, CheckCircle, Clock, Crosshair,
  Crown, Map, BookOpen, Scale, GitBranch,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRulerSnapshot } from '../../lib/macrocoderApi'
import {
  PIECE_BREAKDOWN,
  HEALTH_SCORE,
  TOP_CONCERNS,
  QUICK_FIXES_AVAILABLE,
  TERRITORY,
  ESTIMATED_COMPLEXITY,
  RECOMMENDED_OPENING,
  DAILY_COSTS,
  COST_PER_TASK,
  BUDGET,
  PROVIDER_COSTS,
  HEALTH_HISTORY,
  QUICK_FIXES_APPLIED,
  PIECES_REMAINING,
  PROVIDER_METRICS,
  PROVIDER_LATENCY_HISTORY,
  STRATEGY_STATS,
  RECENT_MOVES,
  ARCHETYPE_PROFILE,
  DOMINANT_ARCHETYPE,
  ARCHETYPE_WELLNESS,
  ARCHETYPE_PREDICTIONS,
  RECENT_TRANSITIONS,
  ACTIVE_THREATS,
  THREAT_SEVERITY_COUNTS,
  THREAT_KIND_COUNTS,
  GO_TERRITORY,
  TERRITORY_BOARD,
  OPENING_BOOK,
  RECENT_RULINGS,
} from './rulerData'

type Tab = 'xray' | 'archetypes' | 'threats' | 'costs' | 'health' | 'providers' | 'strategies'

interface RulerDataResult {
  data: {
    pieceBreakdown: typeof PIECE_BREAKDOWN
    healthScore: number
    territory: typeof TERRITORY
    concerns: typeof TOP_CONCERNS
    dailyCosts: typeof DAILY_COSTS
    costPerTask: typeof COST_PER_TASK
    budget: typeof BUDGET
    providerCosts: typeof PROVIDER_COSTS
    healthHistory: typeof HEALTH_HISTORY
    providerMetrics: typeof PROVIDER_METRICS
    providerLatencyHistory: typeof PROVIDER_LATENCY_HISTORY
    strategyStats: typeof STRATEGY_STATS
    recentMoves: typeof RECENT_MOVES
    archetypeProfile: typeof ARCHETYPE_PROFILE
    dominantArchetype: string
    archetypeWellness: number
    archetypePredictions: typeof ARCHETYPE_PREDICTIONS
    recentTransitions: typeof RECENT_TRANSITIONS
    activeThreats: typeof ACTIVE_THREATS
    threatSeverityCounts: typeof THREAT_SEVERITY_COUNTS
    threatKindCounts: typeof THREAT_KIND_COUNTS
    goTerritory: typeof GO_TERRITORY
    territoryBoard: typeof TERRITORY_BOARD
    openingBook: typeof OPENING_BOOK
    recentRulings: typeof RECENT_RULINGS
    quickFixesAvailable: number
    estimatedComplexity: string
    recommendedOpening: string
  }
  loading: boolean
  source: 'api' | 'demo'
  refresh: () => Promise<void>
}

function useRulerData(): RulerDataResult {
  const [snapshot, setSnapshot] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await getRulerSnapshot()
    setSnapshot(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    getRulerSnapshot().then(data => {
      setSnapshot(data)
      setLoading(false)
    })
  }, [])

  const data = useMemo(() => {
    const src = snapshot || {}
    return {
      pieceBreakdown: src.pieceBreakdown || PIECE_BREAKDOWN,
      healthScore: src.healthScore ?? HEALTH_SCORE,
      territory: src.territory || TERRITORY,
      concerns: src.concerns || TOP_CONCERNS,
      dailyCosts: src.costs?.dailyCosts || DAILY_COSTS,
      costPerTask: src.costs?.costPerTask || COST_PER_TASK,
      budget: src.costs?.budget || BUDGET,
      providerCosts: src.costs?.providerCosts || PROVIDER_COSTS,
      healthHistory: src.healthHistory || HEALTH_HISTORY,
      providerMetrics: src.providerMetrics || PROVIDER_METRICS,
      providerLatencyHistory: src.providerLatencyHistory || PROVIDER_LATENCY_HISTORY,
      strategyStats: src.strategyStats || STRATEGY_STATS,
      recentMoves: src.recentMoves || RECENT_MOVES,
      archetypeProfile: src.archetypeProfile || ARCHETYPE_PROFILE,
      dominantArchetype: src.dominantArchetype || DOMINANT_ARCHETYPE,
      archetypeWellness: src.archetypeWellness ?? ARCHETYPE_WELLNESS,
      archetypePredictions: src.archetypePredictions || ARCHETYPE_PREDICTIONS,
      recentTransitions: src.recentTransitions || RECENT_TRANSITIONS,
      activeThreats: src.activeThreats || ACTIVE_THREATS,
      threatSeverityCounts: src.threatSeverityCounts || THREAT_SEVERITY_COUNTS,
      threatKindCounts: src.threatKindCounts || THREAT_KIND_COUNTS,
      goTerritory: src.goTerritory || GO_TERRITORY,
      territoryBoard: src.territoryBoard || TERRITORY_BOARD,
      openingBook: src.openingBook || OPENING_BOOK,
      recentRulings: src.recentRulings || RECENT_RULINGS,
      quickFixesAvailable: src.concerns?.length ? Math.floor(src.concerns.length * 0.6) : QUICK_FIXES_AVAILABLE,
      estimatedComplexity: src.territory?.dominant ? 'Advanced' : ESTIMATED_COMPLEXITY,
      recommendedOpening: src.territory?.dominant || RECOMMENDED_OPENING,
    }
  }, [snapshot])

  return { data, loading, source: snapshot ? 'api' : 'demo', refresh }
}

// ── Shared Components ───────────────────────────────────────────────

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#111c1e] border border-[#1e2e2e] rounded-lg p-6 ${className}`}>{children}</div>
}

function SectionHeader({ icon: Icon, label, iconColor = '#8aaa9a' }: { icon: typeof Activity; label: string; iconColor?: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon className="h-4 w-4" style={{ color: iconColor }} />
      <span className="text-[11px] uppercase tracking-[0.15em] text-[#8aaa9a] font-medium">{label}</span>
    </div>
  )
}

function SvgLineChart({
  data, xKey, lines, maxY, yFormat, height = 180,
}: {
  data: Record<string, any>[]
  xKey: string
  lines: { key: string; color: string; label: string; dashed?: boolean }[]
  maxY: number
  yFormat: (v: number) => string
  height?: number
}) {
  const w = 960, h = height
  const padL = 50, padR = 20, padT = 15, padB = 30
  const chartW = w - padL - padR, chartH = h - padT - padB
  const toX = (i: number) => padL + (i / (data.length - 1)) * chartW
  const toY = (v: number) => padT + chartH - (v / maxY) * chartH
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: padT + chartH - f * chartH, label: yFormat(f * maxY) }))

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        {lines.map(line => (
          <linearGradient key={line.key} id={`grad-${line.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={line.color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={line.color} stopOpacity="0.01" />
          </linearGradient>
        ))}
      </defs>
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padL} y1={g.y} x2={w - padR} y2={g.y} stroke="#1e2e2e" strokeWidth="1" />
          <text x={padL - 8} y={g.y + 4} textAnchor="end" fill="#5a7a7a" fontSize="10" fontFamily="monospace">{g.label}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={h - 5} textAnchor="middle" fill="#5a7a7a" fontSize="9" fontFamily="monospace">{d[xKey]}</text>
      ))}
      {lines.map((line, li) => {
        const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)} ${toY(d[line.key])}`).join(' ')
        const area = li === 0 ? path + ` L${toX(data.length - 1)} ${padT + chartH} L${toX(0)} ${padT + chartH} Z` : null
        return (
          <g key={line.key}>
            {area && <path d={area} fill={`url(#grad-${line.key})`} />}
            <path d={path} fill="none" stroke={line.color} strokeWidth="2" strokeDasharray={line.dashed ? '6 4' : undefined} />
          </g>
        )
      })}
      <g transform={`translate(${w - padR - lines.length * 100}, ${padT})`}>
        {lines.map((line, i) => (
          <g key={line.key} transform={`translate(${i * 100}, 0)`}>
            <line x1="0" y1="6" x2="14" y2="6" stroke={line.color} strokeWidth="2" strokeDasharray={line.dashed ? '4 3' : undefined} />
            <text x="18" y="10" fill="#8aaa9a" fontSize="10" fontFamily="monospace">{line.label}</text>
          </g>
        ))}
      </g>
    </svg>
  )
}

function DonutChart({ data, center, sub, size = 180, thickness = 28 }: {
  data: { percentage: number; color: string }[]
  center: string
  sub: string
  size?: number
  thickness?: number
}) {
  const r = (size - thickness) / 2
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2e2e" strokeWidth={thickness} />
      {data.map((seg, i) => {
        const dash = (seg.percentage / 100) * circ
        const rotation = (offset / 100) * 360 - 90
        offset += seg.percentage
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={thickness} strokeDasharray={`${dash} ${circ - dash}`} transform={`rotate(${rotation} ${cx} ${cy})`} />
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#ece7e2" fontSize="24" fontWeight="bold" fontFamily="monospace">{center}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#5a7a7a" fontSize="10" fontFamily="monospace">{sub}</text>
    </svg>
  )
}

const severityColor = (s: string) => ({
  critical: 'text-[#c45a3a]', high: 'text-[#e0a040]', medium: 'text-[#facc15]', low: 'text-[#22d3ee]', info: 'text-[#5a7a7a]', none: 'text-[#3a5050]',
}[s] || 'text-[#5a7a7a]')

const severityDot = (s: string) => ({
  critical: 'bg-[#c45a3a]', high: 'bg-[#e0a040]', medium: 'bg-[#facc15]', low: 'bg-[#22d3ee]', info: 'bg-[#5a7a7a]', none: 'bg-[#3a5050]',
}[s] || 'bg-[#5a7a7a]')

// ── Tier 1: Codebase X-Ray ──────────────────────────────────────────

function XRayTab() {
  const maxTerritory = Math.max(TERRITORY.concurrent, TERRITORY.async, TERRITORY.errorHandling, TERRITORY.unsafeCode, TERRITORY.reflection)
  const territories = [
    { label: 'Concurrent', value: TERRITORY.concurrent, color: '#1fc164' },
    { label: 'Async', value: TERRITORY.async, color: '#22d3ee' },
    { label: 'Error Handling', value: TERRITORY.errorHandling, color: '#e0a040' },
    { label: 'Unsafe', value: TERRITORY.unsafeCode, color: '#c45a3a' },
    { label: 'Reflection', value: TERRITORY.reflection, color: '#a78bfa' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard className="lg:col-span-2">
          <SectionHeader icon={Shield} label="Pattern DNA — Piece Breakdown" iconColor="#e0a040" />
          <div className="flex gap-8 items-center">
            <DonutChart data={PIECE_BREAKDOWN} center={`${HEALTH_SCORE}`} sub="/ 100" />
            <div className="flex-1 space-y-2">
              {PIECE_BREAKDOWN.map(p => (
                <div key={p.piece} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-[12px] text-[#d0dede] font-mono flex-1">{p.piece}</span>
                  <span className="text-[12px] text-[#8aaa9a] font-mono w-8 text-right">{p.count}</span>
                  <span className="text-[11px] text-[#5a7a7a] font-mono w-10 text-right">{p.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
        <div className="space-y-4">
          <SectionCard>
            <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-2">Territory</div>
            <div className="text-[20px] font-bold text-[#e0a040] tracking-tight">{TERRITORY.dominant}</div>
          </SectionCard>
          <SectionCard>
            <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-2">Recommended Opening</div>
            <div className="text-[18px] font-bold text-[#22d3ee] tracking-tight">{RECOMMENDED_OPENING}</div>
          </SectionCard>
          <div className="grid grid-cols-2 gap-4">
            <SectionCard>
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-1">Complexity</div>
              <div className="text-[16px] font-bold text-[#a78bfa]">{ESTIMATED_COMPLEXITY}</div>
            </SectionCard>
            <SectionCard>
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-1">Quick Fixes</div>
              <div className="text-[16px] font-bold text-[#1fc164]">{QUICK_FIXES_AVAILABLE}</div>
            </SectionCard>
          </div>
        </div>
      </div>

      <SectionCard>
        <SectionHeader icon={Activity} label="Territory Map" iconColor="#1fc164" />
        <div className="space-y-3">
          {territories.map(t => (
            <div key={t.label} className="flex items-center gap-3">
              <span className="text-[12px] text-[#8aaa9a] w-28 text-right font-mono">{t.label}</span>
              <div className="flex-1 h-5 bg-[#0a1214] rounded overflow-hidden">
                <div className="h-full rounded" style={{ width: `${(t.value / maxTerritory) * 100}%`, backgroundColor: t.color }} />
              </div>
              <span className="text-[12px] text-[#5a7a7a] font-mono w-8 text-right">{t.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader icon={AlertTriangle} label="Top Concerns" iconColor="#c45a3a" />
        <div className="space-y-3">
          {TOP_CONCERNS.map((c, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-[#142020] transition-colors">
              <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${severityDot(c.severity)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${severityColor(c.severity)}`}>{c.severity}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#1e2e2e] text-[10px] text-[#8aaa9a] font-mono">{c.piece}</span>
                </div>
                <p className="text-[13px] text-[#d0dede] mt-1">{c.description}</p>
                <p className="text-[10px] text-[#5a7a7a] font-mono mt-1">{c.location}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Opening Book */}
      <SectionCard>
        <SectionHeader icon={BookOpen} label="Opening Book" iconColor="#22d3ee" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e2e2e]">
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Opening</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Type</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Difficulty</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Key Pieces</th>
                <th className="text-right px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Moves</th>
              </tr>
            </thead>
            <tbody>
              {OPENING_BOOK.map(o => {
                const diffColor = { Beginner: 'text-[#1fc164]', Intermediate: 'text-[#22d3ee]', Advanced: 'text-[#e0a040]', Expert: 'text-[#c45a3a]' }[o.difficulty]
                return (
                  <tr key={o.name} className="border-b border-[#1e2e2e]/50 hover:bg-[#142020] transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-[13px] text-[#ece7e2] font-medium">{o.name}</div>
                      <div className="text-[10px] text-[#5a7a7a] mt-0.5">{o.description}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#8aaa9a] font-mono">{o.projectType}</td>
                    <td className={`px-4 py-3 text-[12px] font-mono font-medium ${diffColor}`}>{o.difficulty}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {o.keyPieces.map(p => (
                          <span key={p} className="px-1.5 py-0.5 rounded bg-[#1e2e2e] text-[10px] text-[#8aaa9a] font-mono">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#d0dede] font-mono text-right">{o.moveCount}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Recent Rulings */}
      <SectionCard>
        <SectionHeader icon={Scale} label="Recent Rulings" iconColor="#a78bfa" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e2e2e]">
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Category</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Pattern</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Transform</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Location</th>
                <th className="text-center px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Priority</th>
                <th className="text-center px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Auto-Safe</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_RULINGS.map((r, i) => (
                <tr key={i} className="border-b border-[#1e2e2e]/50 hover:bg-[#142020] transition-colors">
                  <td className="px-4 py-3 text-[12px] text-[#d0dede] font-mono">{r.category}</td>
                  <td className="px-4 py-3 text-[12px] text-[#8aaa9a] font-mono">{r.pattern}</td>
                  <td className="px-4 py-3 text-[12px] text-[#22d3ee] font-mono">{r.transformation}</td>
                  <td className="px-4 py-3 text-[10px] text-[#5a7a7a] font-mono">{r.location}</td>
                  <td className={`px-4 py-3 text-[11px] font-mono font-bold text-center uppercase ${severityColor(r.priority)}`}>{r.priority}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[11px] font-mono ${r.autoSafe ? 'text-[#1fc164]' : 'text-[#c45a3a]'}`}>{r.autoSafe ? 'YES' : 'NO'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Archetypes Tab ──────────────────────────────────────────────────

function ArchetypesTab() {
  const maxWeight = Math.max(...ARCHETYPE_PROFILE.map(a => a.weight))

  return (
    <div className="space-y-6">
      {/* Dominant + Wellness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard className="lg:col-span-2">
          <SectionHeader icon={Crown} label="Archetypal Profile" iconColor="#e0a040" />
          <div className="flex gap-8 items-center">
            <DonutChart
              data={ARCHETYPE_PROFILE.map(a => ({ percentage: a.weight * 100, color: a.color }))}
              center={DOMINANT_ARCHETYPE}
              sub="dominant"
              size={180}
            />
            <div className="flex-1 space-y-2.5">
              {ARCHETYPE_PROFILE.map(a => (
                <div key={a.archetype} className="flex items-center gap-3">
                  <span className="text-[14px] w-6 text-center">{a.icon}</span>
                  <span className="text-[12px] text-[#d0dede] font-mono w-24">{a.archetype}</span>
                  <div className="flex-1 h-4 bg-[#0a1214] rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${(a.weight / maxWeight) * 100}%`, backgroundColor: a.color }} />
                  </div>
                  <span className="text-[11px] text-[#8aaa9a] font-mono w-10 text-right">{(a.weight * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard>
            <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-2">Cell Wellness</div>
            <div className="text-[28px] font-bold text-[#1fc164] font-mono">{ARCHETYPE_WELLNESS}</div>
            <div className="mt-2 h-2 bg-[#0a1214] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#1fc164]" style={{ width: `${ARCHETYPE_WELLNESS}%` }} />
            </div>
          </SectionCard>
          <SectionCard>
            <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-3">Active Subtypes</div>
            <div className="space-y-2">
              {ARCHETYPE_PROFILE.slice(0, 4).map(a => (
                <div key={a.archetype} className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8aaa9a] font-mono">{a.archetype}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: a.color + '20', color: a.color }}>{a.subtype}</span>
                    <span className="text-[10px] text-[#5a7a7a] font-mono">{a.phase}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Archetype → Provider Routing */}
      <SectionCard>
        <SectionHeader icon={Cpu} label="Archetype → AI Provider Routing" iconColor="#e0a040" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#1e2e2e]">
              <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Archetype</th>
              <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Drive</th>
              <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Provider</th>
              <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Reason</th>
            </tr></thead>
            <tbody>
              {ARCHETYPE_PROFILE.map(a => {
                const providerColor: Record<string, string> = { 'claude-sonnet': '#e0a040', 'gpt-4o': '#22d3ee', 'gpt-4o-mini': '#1fc164', 'ollama-codellama': '#a78bfa' }
                return (
                  <tr key={a.archetype} className="border-b border-[#1e2e2e]/50 hover:bg-[#142020] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px]">{a.icon}</span>
                        <span className="text-[12px] font-bold font-mono" style={{ color: a.color }}>{a.archetype}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: a.color + '20', color: a.color }}>{a.subtype}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#8aaa9a] max-w-[200px]">{a.desire}</td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-mono font-medium" style={{ color: providerColor[a.provider] || '#d0dede' }}>{a.provider}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#5a7a7a]">{a.providerReason}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Predictions */}
      <SectionCard>
        <SectionHeader icon={AlertTriangle} label="Archetype Predictions — Risk Patterns" iconColor="#c45a3a" />
        <div className="space-y-3">
          {ARCHETYPE_PREDICTIONS.map(p => (
            <div key={p.id} className="px-4 py-4 rounded-lg border border-[#1e2e2e]/50 hover:bg-[#142020] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">{p.icon}</span>
                  <span className="text-[13px] text-[#ece7e2] font-mono font-medium">{p.type}</span>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${severityColor(p.severity)}`}>{p.severity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-[#0a1214] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${p.probability >= 60 ? 'bg-[#c45a3a]' : p.probability >= 40 ? 'bg-[#e0a040]' : 'bg-[#1fc164]'}`} style={{ width: `${p.probability}%` }} />
                  </div>
                  <span className="text-[12px] text-[#d0dede] font-mono">{p.probability}%</span>
                </div>
              </div>
              <p className="text-[12px] text-[#d0dede] mb-2">{p.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-[#5a7a7a] uppercase text-[9px] tracking-wider">Evidence:</span> <span className="text-[#8aaa9a]">{p.evidence}</span></div>
                <div><span className="text-[#5a7a7a] uppercase text-[9px] tracking-wider">Prevention:</span> <span className="text-[#1fc164]">{p.prevention}</span></div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Recent Transitions */}
      <SectionCard>
        <SectionHeader icon={GitBranch} label="Recent Archetype Transitions" iconColor="#22d3ee" />
        <div className="divide-y divide-[#1e2e2e]/50">
          {RECENT_TRANSITIONS.map((t, i) => {
            const fromArch = ARCHETYPE_PROFILE.find(a => a.archetype === t.from)
            const toArch = ARCHETYPE_PROFILE.find(a => a.archetype === t.to)
            return (
              <div key={i} className="flex items-center justify-between py-3 px-2 hover:bg-[#142020] transition-colors rounded">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-mono font-bold" style={{ color: fromArch?.color || '#5a7a7a' }}>{t.from}</span>
                  <span className="text-[#5a7a7a] text-[11px]">{'\u2192'}</span>
                  <span className="text-[12px] font-mono font-bold" style={{ color: toArch?.color || '#5a7a7a' }}>{t.to}</span>
                  <span className="text-[11px] text-[#8aaa9a]">{t.trigger}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className="text-[10px] text-[#5a7a7a] font-mono">{t.section}</span>
                  <span className="text-[10px] text-[#5a7a7a] font-mono">{t.timestamp}</span>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}

// ── Threats & Board Tab ─────────────────────────────────────────────

function ThreatsTab() {
  const maxKind = Math.max(...THREAT_KIND_COUNTS.map(t => t.count))
  const cellColors = ['#1e2e2e', '#1fc164', '#c45a3a', '#e0a040']

  return (
    <div className="space-y-6">
      {/* Severity summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['critical', 'high', 'medium', 'low', 'none'] as const).map(s => (
          <SectionCard key={s}>
            <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-1">{s}</div>
            <div className={`text-[24px] font-bold font-mono ${severityColor(s)}`}>{THREAT_SEVERITY_COUNTS[s]}</div>
          </SectionCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat kinds */}
        <SectionCard>
          <SectionHeader icon={Crosshair} label="Threat Kinds — Distribution" iconColor="#c45a3a" />
          <div className="space-y-2.5">
            {THREAT_KIND_COUNTS.map(t => (
              <div key={t.kind} className="flex items-center gap-3">
                <span className="text-[11px] text-[#8aaa9a] w-40 text-right font-mono truncate">{t.kind}</span>
                <div className="flex-1 h-4 bg-[#0a1214] rounded overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${(t.count / maxKind) * 100}%`, backgroundColor: t.color }} />
                </div>
                <span className="text-[12px] text-[#d0dede] font-mono w-6 text-right">{t.count}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Go Territory Board */}
        <SectionCard>
          <SectionHeader icon={Map} label="Go Territory Board — Code Control" iconColor="#1fc164" />
          <div className="flex gap-6 items-start">
            <div className="inline-grid grid-cols-8 gap-0.5 p-2 bg-[#0a1214] rounded">
              {TERRITORY_BOARD.flat().map((cell, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-sm"
                  style={{ backgroundColor: cellColors[cell], opacity: cell === 0 ? 0.3 : 0.6 }}
                />
              ))}
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#1fc164] opacity-60" /><span className="text-[11px] text-[#8aaa9a] font-mono">Safe ({GO_TERRITORY.blackControl}%)</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#c45a3a] opacity-60" /><span className="text-[11px] text-[#8aaa9a] font-mono">Risky ({GO_TERRITORY.whiteControl}%)</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#e0a040] opacity-60" /><span className="text-[11px] text-[#8aaa9a] font-mono">Contested ({GO_TERRITORY.contested}%)</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#1e2e2e] opacity-30" /><span className="text-[11px] text-[#8aaa9a] font-mono">Neutral ({GO_TERRITORY.neutral}%)</span></div>
              <div className="mt-4 pt-3 border-t border-[#1e2e2e] space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono"><span className="text-[#5a7a7a]">Liberties</span><span className="text-[#22d3ee]">{GO_TERRITORY.totalLiberties}</span></div>
                <div className="flex justify-between text-[10px] font-mono"><span className="text-[#5a7a7a]">Dead code removed</span><span className="text-[#1fc164]">{GO_TERRITORY.capturesBlack}</span></div>
                <div className="flex justify-between text-[10px] font-mono"><span className="text-[#5a7a7a]">Regressions</span><span className="text-[#c45a3a]">{GO_TERRITORY.capturesWhite}</span></div>
                <div className="flex justify-between text-[10px] font-mono"><span className="text-[#5a7a7a]">Ko hash</span><span className="text-[#5a7a7a]">{GO_TERRITORY.koHash}</span></div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Active Threats */}
      <SectionCard>
        <SectionHeader icon={AlertTriangle} label="Active Threats" iconColor="#c45a3a" />
        <div className="divide-y divide-[#1e2e2e]/50">
          {ACTIVE_THREATS.map((t, i) => (
            <div key={i} className="flex items-start gap-3 py-3 px-2 hover:bg-[#142020] transition-colors rounded">
              <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${severityDot(t.severity)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] text-[#ece7e2] font-mono font-medium">{t.kind}</span>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${severityColor(t.severity)}`}>{t.severity}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#1e2e2e] text-[10px] text-[#8aaa9a] font-mono">{t.piece}</span>
                </div>
                <p className="text-[12px] text-[#d0dede] mt-1">{t.description}</p>
                <p className="text-[10px] text-[#5a7a7a] font-mono mt-1">{t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ── Tier 1: Cost Tracker ────────────────────────────────────────────

function CostsTab() {
  const maxDaily = Math.max(...DAILY_COSTS.map(d => d.claude + d.openrouter + d.ollama))
  const maxTaskCost = Math.max(...COST_PER_TASK.map(t => t.avgCost))
  const budgetPct = Math.round((BUDGET.spent / BUDGET.total) * 100)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SectionCard>
          <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-1">Weekly Spend</div>
          <div className="text-[24px] font-bold text-[#ece7e2] font-mono">${BUDGET.spent.toFixed(2)}</div>
          <div className="text-[11px] text-[#5a7a7a] mt-1">of ${BUDGET.total.toFixed(2)} budget</div>
        </SectionCard>
        <SectionCard>
          <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-1">Budget Remaining</div>
          <div className={`text-[24px] font-bold font-mono ${budgetPct > 80 ? 'text-[#c45a3a]' : 'text-[#1fc164]'}`}>{100 - budgetPct}%</div>
          <div className="mt-2 h-2 bg-[#0a1214] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${budgetPct > 80 ? 'bg-[#c45a3a]' : 'bg-[#1fc164]'}`} style={{ width: `${budgetPct}%` }} />
          </div>
        </SectionCard>
        <SectionCard>
          <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-1">Cache Savings</div>
          <div className="text-[24px] font-bold text-[#1fc164] font-mono">${BUDGET.cacheSavings.toFixed(2)}</div>
          <div className="text-[11px] text-[#5a7a7a] mt-1">{BUDGET.requestsAvoided.toLocaleString()} requests avoided</div>
        </SectionCard>
        <SectionCard>
          <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-1">Cache Hit Rate</div>
          <div className="text-[24px] font-bold text-[#22d3ee] font-mono">{BUDGET.cacheHitRate}%</div>
          <div className="mt-2 h-2 bg-[#0a1214] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#22d3ee]" style={{ width: `${BUDGET.cacheHitRate}%` }} />
          </div>
        </SectionCard>
      </div>
      <SectionCard>
        <SectionHeader icon={DollarSign} label="Daily AI Spend — 7 Days" iconColor="#e0a040" />
        <SvgLineChart
          data={DAILY_COSTS} xKey="date"
          lines={[{ key: 'claude', color: '#e0a040', label: 'Claude' }, { key: 'openrouter', color: '#22d3ee', label: 'OpenRouter', dashed: true }]}
          maxY={Math.ceil(maxDaily)} yFormat={(v) => `$${v.toFixed(1)}`}
        />
      </SectionCard>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard>
          <SectionHeader icon={Cpu} label="Cost Per Provider" iconColor="#a78bfa" />
          <div className="space-y-3">
            {PROVIDER_COSTS.map(p => (
              <div key={p.provider} className="flex items-center gap-3">
                <span className="text-[11px] text-[#8aaa9a] w-28 text-right font-mono truncate">{p.provider}</span>
                <div className="flex-1 h-5 bg-[#0a1214] rounded overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${p.percentage}%`, backgroundColor: p.color }} />
                </div>
                <span className="text-[12px] text-[#d0dede] font-mono w-16 text-right">${p.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard>
          <SectionHeader icon={Zap} label="Cost Per Task Type" iconColor="#facc15" />
          <div className="space-y-2.5">
            {COST_PER_TASK.map(t => (
              <div key={t.task} className="flex items-center justify-between px-2 py-2 rounded hover:bg-[#142020] transition-colors">
                <span className="text-[12px] text-[#d0dede] font-mono">{t.task}</span>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-[#5a7a7a] font-mono">{t.count}x</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-[#0a1214] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#e0a040]" style={{ width: `${(t.avgCost / maxTaskCost) * 100}%` }} />
                    </div>
                    <span className="text-[12px] text-[#e0a040] font-mono w-14 text-right">${t.avgCost.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

// ── Tier 1: Project Health ──────────────────────────────────────────

function HealthTab() {
  const latest = HEALTH_HISTORY[HEALTH_HISTORY.length - 1]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SectionCard>
          <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-1">Current Health</div>
          <div className="text-[28px] font-bold text-[#1fc164] font-mono">{latest.score}</div>
          <div className="text-[11px] text-[#5a7a7a] mt-1">up from {HEALTH_HISTORY[0].score}</div>
        </SectionCard>
        <SectionCard>
          <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-1">Pieces Resolved</div>
          <div className="text-[28px] font-bold text-[#22d3ee] font-mono">{latest.piecesResolved}</div>
          <div className="text-[11px] text-[#5a7a7a] mt-1">{PIECES_REMAINING} remaining</div>
        </SectionCard>
        <SectionCard>
          <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-1">Concerns Closed</div>
          <div className="text-[28px] font-bold text-[#e0a040] font-mono">{latest.concernsClosed}</div>
          <div className="text-[11px] text-[#5a7a7a] mt-1">across {HEALTH_HISTORY.length} sessions</div>
        </SectionCard>
        <SectionCard>
          <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium mb-1">Quick Fixes Applied</div>
          <div className="text-[28px] font-bold text-[#a78bfa] font-mono">{QUICK_FIXES_APPLIED}</div>
          <div className="text-[11px] text-[#5a7a7a] mt-1">auto-safe transformations</div>
        </SectionCard>
      </div>
      <SectionCard>
        <SectionHeader icon={TrendingUp} label="Health Score Trend" iconColor="#1fc164" />
        <SvgLineChart data={HEALTH_HISTORY} xKey="session" lines={[{ key: 'score', color: '#1fc164', label: 'Health Score' }]} maxY={100} yFormat={(v) => `${Math.round(v)}`} />
      </SectionCard>
      <SectionCard>
        <SectionHeader icon={CheckCircle} label="Resolution Progress" iconColor="#22d3ee" />
        <SvgLineChart
          data={HEALTH_HISTORY} xKey="session"
          lines={[{ key: 'piecesResolved', color: '#22d3ee', label: 'Pieces' }, { key: 'concernsClosed', color: '#e0a040', label: 'Concerns', dashed: true }]}
          maxY={50} yFormat={(v) => `${Math.round(v)}`}
        />
      </SectionCard>
    </div>
  )
}

// ── Tier 2: Provider Performance ────────────────────────────────────

function ProvidersTab() {
  const maxLatency = Math.max(...PROVIDER_LATENCY_HISTORY.map(d => Math.max(d.claude, d.gpt4o, d.mini, d.ollama)))
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PROVIDER_METRICS.map(p => (
          <SectionCard key={p.provider}>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-[11px] text-[#d0dede] font-mono font-medium">{p.provider}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-[10px] text-[#5a7a7a] uppercase">Latency</span><span className="text-[12px] text-[#d0dede] font-mono">{p.avgLatency}ms</span></div>
              <div className="flex justify-between"><span className="text-[10px] text-[#5a7a7a] uppercase">Success</span><span className={`text-[12px] font-mono ${p.successRate >= 95 ? 'text-[#1fc164]' : p.successRate >= 90 ? 'text-[#e0a040]' : 'text-[#c45a3a]'}`}>{p.successRate}%</span></div>
              <div className="flex justify-between"><span className="text-[10px] text-[#5a7a7a] uppercase">429s</span><span className={`text-[12px] font-mono ${p.throttleCount > 5 ? 'text-[#c45a3a]' : 'text-[#8aaa9a]'}`}>{p.throttleCount}</span></div>
              <div className="flex justify-between"><span className="text-[10px] text-[#5a7a7a] uppercase">Fallbacks</span><span className={`text-[12px] font-mono ${p.fallbackCount > 0 ? 'text-[#e0a040]' : 'text-[#8aaa9a]'}`}>{p.fallbackCount}</span></div>
            </div>
          </SectionCard>
        ))}
      </div>
      <SectionCard>
        <SectionHeader icon={Clock} label="Provider Latency — Today" iconColor="#22d3ee" />
        <SvgLineChart
          data={PROVIDER_LATENCY_HISTORY} xKey="time"
          lines={[
            { key: 'claude', color: '#e0a040', label: 'Claude' },
            { key: 'gpt4o', color: '#22d3ee', label: 'GPT-4o', dashed: true },
            { key: 'mini', color: '#1fc164', label: 'Mini' },
            { key: 'ollama', color: '#a78bfa', label: 'Ollama', dashed: true },
          ]}
          maxY={Math.ceil(maxLatency / 500) * 500}
          yFormat={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`}
        />
      </SectionCard>
      <SectionCard>
        <SectionHeader icon={Cpu} label="Provider Routing — Complexity Matrix" iconColor="#e0a040" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#1e2e2e]">
              <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Complexity</th>
              <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Provider</th>
              <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Reason</th>
            </tr></thead>
            <tbody>
              {[
                ['3+ indicators', 'claude-sonnet', '#e0a040', 'Complex multi-pattern code'],
                ['2 indicators', 'gpt-4o', '#22d3ee', 'Moderate complexity'],
                ['1 indicator', 'gpt-4o-mini', '#1fc164', 'Simple async/error fixes'],
                ['0 indicators', 'ollama-codellama', '#a78bfa', 'Detection only'],
              ].map(([comp, prov, color, reason]) => (
                <tr key={prov} className="border-b border-[#1e2e2e]/50">
                  <td className="px-4 py-3 text-[12px] text-[#d0dede] font-mono">{comp}</td>
                  <td className="px-4 py-3 text-[12px] font-mono font-medium" style={{ color: color as string }}>{prov}</td>
                  <td className="px-4 py-3 text-[12px] text-[#8aaa9a]">{reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Tier 2: Strategy Effectiveness ──────────────────────────────────

function StrategiesTab() {
  return (
    <div className="space-y-6">
      <SectionCard>
        <SectionHeader icon={Swords} label="Strategy Success Rates" iconColor="#e0a040" />
        <div className="space-y-3">
          {STRATEGY_STATS.map(s => (
            <div key={s.strategy} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-[#142020] transition-colors">
              <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-[12px] text-[#d0dede] font-mono w-32">{s.strategy}</span>
              <div className="flex-1 h-4 bg-[#0a1214] rounded overflow-hidden relative">
                <div className="h-full rounded" style={{ width: `${s.successRate}%`, backgroundColor: s.color, opacity: 0.7 }} />
                <span className="absolute inset-y-0 right-2 flex items-center text-[10px] text-[#d0dede] font-mono">{s.successRate}%</span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-[10px] text-[#5a7a7a] font-mono w-14 text-right">{s.totalAttempts} tries</span>
                <span className="text-[10px] text-[#1fc164] font-mono w-12 text-right">+{s.avgHealthImprovement.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard>
        <SectionHeader icon={Shield} label="Best Strategy Per Piece Type" iconColor="#22d3ee" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#1e2e2e]">
              <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Strategy</th>
              <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Best For</th>
              <th className="text-right px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Success</th>
              <th className="text-right px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Health +</th>
            </tr></thead>
            <tbody>
              {STRATEGY_STATS.map(s => (
                <tr key={s.strategy} className="border-b border-[#1e2e2e]/50 hover:bg-[#142020] transition-colors">
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} /><span className="text-[12px] text-[#d0dede] font-mono">{s.strategy}</span></div></td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-[#1e2e2e] text-[11px] text-[#8aaa9a] font-mono">{s.bestForPiece}</span></td>
                  <td className={`px-4 py-3 text-[12px] font-mono text-right ${s.successRate >= 85 ? 'text-[#1fc164]' : s.successRate >= 70 ? 'text-[#e0a040]' : 'text-[#c45a3a]'}`}>{s.successRate}%</td>
                  <td className="px-4 py-3 text-[12px] text-[#1fc164] font-mono text-right">+{s.avgHealthImprovement.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard>
        <SectionHeader icon={Activity} label="Recent Moves — Telemetry" iconColor="#facc15" />
        <div className="divide-y divide-[#1e2e2e]/50">
          {RECENT_MOVES.map((m, i) => (
            <div key={i} className="flex items-center justify-between py-3 px-2 hover:bg-[#142020] transition-colors rounded">
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${m.success ? 'bg-[#1fc164]' : 'bg-[#c45a3a]'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#d0dede] font-mono font-medium">{m.strategy}</span>
                    <span className="text-[10px] text-[#5a7a7a]">on</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#1e2e2e] text-[10px] text-[#8aaa9a] font-mono">{m.piece}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-[#5a7a7a] font-mono">{m.timestamp}</span>
                    <span className="text-[10px] text-[#5a7a7a] font-mono">{m.provider}</span>
                    <span className="text-[10px] text-[#5a7a7a] font-mono">{m.latencyMs}ms</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-[#5a7a7a] font-mono">{m.healthBefore}</span>
                  <span className="text-[11px] text-[#5a7a7a]">{'\u2192'}</span>
                  <span className={`text-[11px] font-mono font-medium ${m.healthAfter > m.healthBefore ? 'text-[#1fc164]' : 'text-[#5a7a7a]'}`}>{m.healthAfter}</span>
                </div>
                <span className={`text-[10px] font-bold tracking-wider ${m.success ? 'text-[#1fc164]' : 'text-[#c45a3a]'}`}>{m.success ? 'SUCCESS' : 'FAILED'}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('xray')
  const [tabOrder, setTabOrder] = useState<Tab[]>(['xray', 'archetypes', 'threats', 'costs', 'health', 'providers', 'strategies'])
  const [draggedTab, setDraggedTab] = useState<Tab | null>(null)
  const { data: _rulerData, loading, source, refresh } = useRulerData()
  const navigate = useNavigate()

  const handleRefresh = () => {
    refresh()
  }

  const handleDragStart = (e: React.DragEvent, tabId: Tab) => {
    setDraggedTab(tabId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', tabId)
  }

  const handleDragOver = (e: React.DragEvent, _tabId: Tab) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetTabId: Tab) => {
    e.preventDefault()
    if (!draggedTab || draggedTab === targetTabId) return
    
    const newOrder = [...tabOrder]
    const draggedIndex = newOrder.indexOf(draggedTab)
    const targetIndex = newOrder.indexOf(targetTabId)
    
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedTab)
    
    setTabOrder(newOrder)
    setDraggedTab(null)
  }

  const handleDragEnd = () => {
    setDraggedTab(null)
  }

  const tabs: { id: Tab; label: string }[] = tabOrder.map(id => ({
    id,
    label: { xray: 'CODEBASE X-RAY', archetypes: 'ARCHETYPES', threats: 'THREATS & BOARD', costs: 'COST TRACKER', health: 'PROJECT HEALTH', providers: 'PROVIDERS', strategies: 'STRATEGIES' }[id] as string
  }))

  return (
    <div className="min-h-screen bg-[#0a1214] text-[#d0dede] [font-family:Inter,ui-sans-serif,system-ui,sans-serif]">
      <header className="border-b border-[#1e2e2e] px-6 py-4">
        <div className="max-w-[1300px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-[12px] text-[#5a7a7a] hover:text-[#8aaa9a] transition-colors cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5" />BACK
            </button>
            <div className="w-px h-5 bg-[#1e2e2e]" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#e0a040]" />
              <span className="text-[14px] uppercase tracking-[0.2em] text-[#ece7e2] font-bold">Ruler Analytics</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#1e2e2e] text-[10px] text-[#5a7a7a] font-mono">macrocoder module</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${source === 'api' ? 'bg-[#1fc164]/20 text-[#1fc164]' : 'bg-[#e0a040]/20 text-[#e0a040]'}`}>
              {source === 'api' ? 'LIVE' : 'DEMO'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 text-[11px] text-[#5a7a7a] hover:text-[#8aaa9a] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />REFRESH
            </button>
            <div className="flex items-center gap-1.5">
              {loading ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-[#e0a040] animate-pulse" />
                  <span className="text-[11px] text-[#e0a040] font-medium">FETCHING</span>
                </>
              ) : source === 'api' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-[#1fc164] animate-pulse" />
                  <span className="text-[11px] text-[#1fc164] font-medium">LIVE</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-[#5a7a7a]" />
                  <span className="text-[11px] text-[#5a7a7a] font-medium">DEMO</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-[#1e2e2e]">
        <div className="max-w-[1300px] mx-auto px-6">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                draggable
                onDragStart={(e) => handleDragStart(e, tab.id)}
                onDragOver={(e) => handleDragOver(e, tab.id)}
                onDrop={(e) => handleDrop(e, tab.id)}
                onDragEnd={handleDragEnd}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-[11px] tracking-[0.1em] font-medium transition-colors border-b-2 whitespace-nowrap cursor-grab select-none ${
                  activeTab === tab.id 
                    ? 'text-[#e0a040] border-[#e0a040]' 
                    : 'text-[#5a7a7a] border-transparent hover:text-[#8aaa9a]'
                } ${draggedTab === tab.id ? 'opacity-50' : ''}`}
              >{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-[1300px] mx-auto px-6 py-6">
        {activeTab === 'xray' && <XRayTab />}
        {activeTab === 'archetypes' && <ArchetypesTab />}
        {activeTab === 'threats' && <ThreatsTab />}
        {activeTab === 'costs' && <CostsTab />}
        {activeTab === 'health' && <HealthTab />}
        {activeTab === 'providers' && <ProvidersTab />}
        {activeTab === 'strategies' && <StrategiesTab />}
      </main>
    </div>
  )
}
