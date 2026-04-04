import { useState } from 'react'
import { ArrowLeft, RefreshCw, Zap, Globe, Server, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  STAT_CARDS,
  REQUEST_VOLUME,
  TRAFFIC_SOURCES,
  EDGE_REGIONS,
  LATENCY_DATA,
  ENDPOINTS,
  DEPLOYMENTS,
} from './analyticsData'

type Tab = 'overview' | 'endpoints' | 'deploys'

function MiniSparkline({ up }: { up: boolean }) {
  const d = up
    ? 'M0 14 Q5 12 10 10 T20 8 T30 5 T40 3 T50 6 T60 4'
    : 'M0 4 Q5 6 10 8 T20 10 T30 12 T40 14 T50 11 T60 13'
  return (
    <svg width="60" height="18" className="ml-auto opacity-60">
      <path d={d} fill="none" stroke="#e0a040" strokeWidth="1.5" />
    </svg>
  )
}

function StatCard({ label, value, change, up }: typeof STAT_CARDS[number]) {
  return (
    <div className="bg-[#111c1e] border border-[#1e2e2e] rounded-lg px-5 py-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">{label}</span>
        <MiniSparkline up={up} />
      </div>
      <span className="text-[28px] font-bold text-[#ece7e2] tracking-tight leading-none mt-1">{value}</span>
      <span className={`text-[12px] font-medium ${up ? 'text-[#1fc164]' : 'text-[#e0a040]'}`}>
        {up ? '↗' : '↘'} {change}
      </span>
    </div>
  )
}

function SvgLineChart({
  data,
  yKey,
  maxY,
  color,
  label,
  yFormat,
  secondaryData,
  secondaryColor,
  secondaryLabel,
}: {
  data: { hour: string; [key: string]: any }[]
  yKey: string
  maxY: number
  color: string
  label: string
  yFormat: (v: number) => string
  secondaryData?: { hour: string; [key: string]: any }[]
  secondaryColor?: string
  secondaryLabel?: string
}) {
  const w = 960
  const h = 200
  const padL = 50
  const padR = 20
  const padT = 10
  const padB = 30
  const chartW = w - padL - padR
  const chartH = h - padT - padB

  const toX = (i: number) => padL + (i / (data.length - 1)) * chartW
  const toY = (v: number) => padT + chartH - (v / maxY) * chartH

  const mainPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)} ${toY(d[yKey])}`).join(' ')
  const areaPath = mainPath + ` L${toX(data.length - 1)} ${padT + chartH} L${toX(0)} ${padT + chartH} Z`

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: padT + chartH - f * chartH,
    label: yFormat(f * maxY),
  }))

  let secondaryPath = ''
  if (secondaryData && secondaryColor) {
    secondaryPath = secondaryData.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)} ${toY(d[yKey])}`).join(' ')
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padL} y1={g.y} x2={w - padR} y2={g.y} stroke="#1e2e2e" strokeWidth="1" />
          <text x={padL - 8} y={g.y + 4} textAnchor="end" fill="#5a7a7a" fontSize="10" fontFamily="monospace">{g.label}</text>
        </g>
      ))}
      {data.filter((_, i) => i % 2 === 0).map((d, i, arr) => (
        <text key={i} x={toX(data.indexOf(d))} y={h - 5} textAnchor="middle" fill="#5a7a7a" fontSize="9" fontFamily="monospace">
          {d.hour}
        </text>
      ))}
      <path d={areaPath} fill={`url(#grad-${yKey})`} />
      <path d={mainPath} fill="none" stroke={color} strokeWidth="2" />
      {secondaryPath && <path d={secondaryPath} fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeDasharray="4 3" />}
      {/* Legend */}
      <g transform={`translate(${w - padR - 160}, ${padT + 5})`}>
        <line x1="0" y1="6" x2="16" y2="6" stroke={color} strokeWidth="2" />
        <text x="20" y="10" fill="#8aaa9a" fontSize="10" fontFamily="monospace">{label}</text>
        {secondaryLabel && secondaryColor && (
          <>
            <line x1="80" y1="6" x2="96" y2="6" stroke={secondaryColor} strokeWidth="1.5" strokeDasharray="4 3" />
            <text x="100" y="10" fill="#8aaa9a" fontSize="10" fontFamily="monospace">{secondaryLabel}</text>
          </>
        )}
      </g>
    </svg>
  )
}

function OverviewTab() {
  const maxRequests = 140000
  const maxLatency = 22
  const maxTraffic = Math.max(...TRAFFIC_SOURCES.map(s => s.count))

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_CARDS.map(card => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Request Volume Chart */}
      <div className="bg-[#111c1e] border border-[#1e2e2e] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-[#e0a040]" />
          <span className="text-[11px] uppercase tracking-[0.15em] text-[#8aaa9a] font-medium">Request Volume — 24H</span>
        </div>
        <SvgLineChart
          data={REQUEST_VOLUME}
          yKey="requests"
          maxY={maxRequests}
          color="#e0a040"
          label="Requests"
          yFormat={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`}
          secondaryData={REQUEST_VOLUME.map(d => ({ ...d, requests: d.errors }))}
          secondaryColor="#c45a3a"
          secondaryLabel="Errors"
        />
      </div>

      {/* Traffic Sources + Edge Regions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <div className="bg-[#111c1e] border border-[#1e2e2e] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="h-4 w-4 text-[#1fc164]" />
            <span className="text-[11px] uppercase tracking-[0.15em] text-[#8aaa9a] font-medium">Traffic Sources</span>
          </div>
          <div className="space-y-3">
            {TRAFFIC_SOURCES.map(s => (
              <div key={s.source} className="flex items-center gap-3">
                <span className="text-[12px] text-[#8aaa9a] w-16 text-right font-mono">{s.source}</span>
                <div className="flex-1 h-6 bg-[#0a1214] rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{ width: `${(s.count / maxTraffic) * 100}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-between text-[9px] text-[#5a7a7a] font-mono pt-1 px-20">
              <span>0</span><span>2,500</span><span>5,000</span><span>7,500</span><span>10,000</span>
            </div>
          </div>
        </div>

        {/* Edge Regions */}
        <div className="bg-[#111c1e] border border-[#1e2e2e] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-5">
            <Server className="h-4 w-4 text-[#8aaa9a]" />
            <span className="text-[11px] uppercase tracking-[0.15em] text-[#8aaa9a] font-medium">Edge Regions</span>
          </div>
          <div className="space-y-4">
            {EDGE_REGIONS.map(r => (
              <div key={r.region} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${r.status === 'healthy' ? 'bg-[#1fc164]' : 'bg-[#e0a040]'}`} />
                  <span className="text-[13px] text-[#d0dede] font-mono">{r.region}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-[12px] text-[#8aaa9a] font-mono">{r.requests} req</span>
                  <span className="text-[12px] text-[#22d3ee] font-mono">{r.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latency Distribution */}
      <div className="bg-[#111c1e] border border-[#1e2e2e] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-[#22d3ee]" />
          <span className="text-[11px] uppercase tracking-[0.15em] text-[#8aaa9a] font-medium">Latency Distribution — 24H</span>
        </div>
        <SvgLineChart
          data={LATENCY_DATA}
          yKey="p50"
          maxY={maxLatency}
          color="#22d3ee"
          label="P50 Latency"
          yFormat={(v) => `${Math.round(v)}ms`}
        />
      </div>
    </div>
  )
}

function EndpointsTab() {
  const methodColors: Record<string, string> = {
    GET: 'text-[#1fc164]',
    POST: 'text-[#e0a040]',
    PUT: 'text-[#a78bfa]',
    DELETE: 'text-[#c45a3a]',
  }

  const isHighLatency = (val: string) => {
    const num = parseInt(val)
    return num >= 1000
  }

  return (
    <div className="bg-[#111c1e] border border-[#1e2e2e] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1e2e2e]">
        <span className="text-[11px] uppercase tracking-[0.15em] text-[#8aaa9a] font-medium">API Endpoints Performance</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e2e2e]">
              <th className="text-left px-6 py-3 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Method</th>
              <th className="text-left px-6 py-3 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Endpoint</th>
              <th className="text-right px-6 py-3 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Requests</th>
              <th className="text-right px-6 py-3 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Avg</th>
              <th className="text-right px-6 py-3 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">P99</th>
              <th className="text-right px-6 py-3 text-[10px] uppercase tracking-[0.15em] text-[#5a7a7a] font-medium">Error %</th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINTS.map((ep, i) => (
              <tr key={i} className="border-b border-[#1e2e2e]/50 hover:bg-[#142020] transition-colors">
                <td className={`px-6 py-4 text-[13px] font-bold font-mono ${methodColors[ep.method] || 'text-[#d0dede]'}`}>{ep.method}</td>
                <td className="px-6 py-4 text-[13px] text-[#d0dede] font-mono">{ep.path}</td>
                <td className="px-6 py-4 text-[13px] text-[#8aaa9a] font-mono text-right">{ep.requests.toLocaleString()}</td>
                <td className={`px-6 py-4 text-[13px] font-mono text-right ${isHighLatency(ep.avg) ? 'text-[#c45a3a]' : 'text-[#d0dede]'}`}>{ep.avg}</td>
                <td className={`px-6 py-4 text-[13px] font-mono text-right ${isHighLatency(ep.p99) ? 'text-[#c45a3a]' : 'text-[#d0dede]'}`}>{ep.p99}</td>
                <td className={`px-6 py-4 text-[13px] font-mono text-right ${parseFloat(ep.errorRate) >= 0.1 ? 'text-[#c45a3a]' : 'text-[#1fc164]'}`}>{ep.errorRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DeploysTab() {
  const statusConfig = {
    success: { color: 'bg-[#1fc164]', text: 'text-[#1fc164]', label: 'SUCCESS' },
    failed: { color: 'bg-[#c45a3a]', text: 'text-[#c45a3a]', label: 'FAILED' },
    building: { color: 'bg-[#e0a040]', text: 'text-[#e0a040]', label: 'BUILDING' },
  }

  return (
    <div className="bg-[#111c1e] border border-[#1e2e2e] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1e2e2e]">
        <span className="text-[11px] uppercase tracking-[0.15em] text-[#8aaa9a] font-medium">Recent Deployments</span>
      </div>
      <div className="divide-y divide-[#1e2e2e]/50">
        {DEPLOYMENTS.map((dep, i) => {
          const cfg = statusConfig[dep.status]
          return (
            <div key={i} className="px-6 py-5 flex items-start justify-between hover:bg-[#142020] transition-colors">
              <div className="flex items-start gap-3">
                <span className={`h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.color} ${dep.status === 'building' ? 'animate-pulse' : ''}`} />
                <div>
                  <p className="text-[14px] text-[#ece7e2] font-medium">{dep.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="px-2 py-0.5 rounded bg-[#1e2e2e] text-[11px] text-[#8aaa9a] font-mono">{dep.branch}</span>
                    <span className="text-[11px] text-[#5a7a7a] font-mono">{dep.agent}</span>
                    <span className="text-[11px] text-[#5a7a7a] font-mono">{dep.duration}</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <span className={`text-[11px] font-bold tracking-wider ${cfg.text}`}>{cfg.label}</span>
                <p className="text-[10px] text-[#5a7a7a] font-mono mt-1">{dep.time}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const navigate = useNavigate()

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'endpoints', label: 'ENDPOINTS' },
    { id: 'deploys', label: 'DEPLOYS' },
  ]

  return (
    <div className="min-h-screen bg-[#0a1214] text-[#d0dede] [font-family:Inter,ui-sans-serif,system-ui,sans-serif]">
      {/* Header */}
      <header className="border-b border-[#1e2e2e] px-6 py-4">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-[12px] text-[#5a7a7a] hover:text-[#8aaa9a] transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              BACK
            </button>
            <div className="w-px h-5 bg-[#1e2e2e]" />
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#e0a040]" />
              <span className="text-[14px] uppercase tracking-[0.2em] text-[#ece7e2] font-bold">Analytics</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 text-[11px] text-[#5a7a7a] hover:text-[#8aaa9a] transition-colors cursor-pointer">
              <RefreshCw className="h-3 w-3" />
              REFRESH
            </button>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#1fc164] animate-pulse" />
              <span className="text-[11px] text-[#1fc164] font-medium">LIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-[#1e2e2e]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex gap-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-[12px] tracking-[0.1em] font-medium transition-colors cursor-pointer border-b-2 ${
                  activeTab === tab.id
                    ? 'text-[#e0a040] border-[#e0a040]'
                    : 'text-[#5a7a7a] border-transparent hover:text-[#8aaa9a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-[1200px] mx-auto px-6 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'endpoints' && <EndpointsTab />}
        {activeTab === 'deploys' && <DeploysTab />}
      </main>
    </div>
  )
}
