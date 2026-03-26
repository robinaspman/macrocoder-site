export interface MarketSignal {
  source: string
  stack: string
  rateLow: number
  rateHigh: number
  geography?: string
  capturedAt: string
}

type MarketSignalInput = Partial<MarketSignal> & Record<string, unknown>

export function normalizeMarketSignal(input: MarketSignalInput): MarketSignal {
  const low = Math.max(10, Number(input.rateLow || 0))
  const high = Math.max(low, Number(input.rateHigh || low))
  return {
    source: String(input.source || 'unknown'),
    stack: String(input.stack || 'default').toLowerCase(),
    rateLow: low,
    rateHigh: high,
    geography: input.geography ? String(input.geography).toLowerCase() : undefined,
    capturedAt: new Date().toISOString()
  }
}

export function aggregateMarketSignals(signals: MarketSignal[], stack: string, geography?: string) {
  const s = stack.toLowerCase()
  const g = geography?.toLowerCase()
  const filtered = signals.filter((x) => x.stack === s && (!g || x.geography === g || !x.geography))
  if (!filtered.length) {
    return { stack: s, geography: g || null, sampleSize: 0, blendedLow: 0, blendedHigh: 0 }
  }

  const blendedLow = Math.round(filtered.reduce((a, b) => a + b.rateLow, 0) / filtered.length)
  const blendedHigh = Math.round(filtered.reduce((a, b) => a + b.rateHigh, 0) / filtered.length)
  return { stack: s, geography: g || null, sampleSize: filtered.length, blendedLow, blendedHigh }
}
