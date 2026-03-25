export function analyzeScopeCreep(message: string, summary: any, rate: number) {
  const normalized = message.toLowerCase()
  const baseline = String(summary?.scope_summary || '').toLowerCase()
  const creepSignals = ['also', 'new', 'add', 'another', 'while you are at it', 'can you build']
  const asks = extractAskUnits(normalized)
  const baselineMatch = baseline && asks.some((a) => baseline.includes(a))
  const looksLikeCreep = creepSignals.some((s) => normalized.includes(s)) && !baselineMatch

  if (!looksLikeCreep) {
    return {
      scopeCreep: false,
      estimatedHours: 0,
      estimatedCost: 0,
      draftReply: 'This request appears aligned with the original scope. I will include it in the current milestone.'
    }
  }

  const estimatedHours = Math.max(2, Math.min(12, asks.length * 2 || 4))
  const estimatedCost = estimatedHours * rate
  return {
    scopeCreep: true,
    estimatedHours,
    estimatedCost,
    draftReply: `This item looks outside our original scope. I can add it as Phase 2 — estimated ${estimatedHours} hours ($${estimatedCost}). Want me to include it?`,
    detectedAsks: asks
  }
}

function extractAskUnits(message: string): string[] {
  const chunks = message
    .split(/[,.]| and /g)
    .map((x) => x.trim())
    .filter((x) => x.length > 6)
  return Array.from(new Set(chunks)).slice(0, 6)
}


export function summarizeScopeEvents(events: Array<{ at: string; message: string; result: any }>) {
  const list = Array.isArray(events) ? events : []
  const creep = list.filter((e) => e?.result?.scopeCreep)
  const approved = creep.filter((e) => /approved|yes|ok/i.test(String(e.message || '')))
  const totalEstimated = creep.reduce((a, e) => a + Number(e?.result?.estimatedCost || 0), 0)

  return {
    totalEvents: list.length,
    scopeCreepEvents: creep.length,
    approvedAdditions: approved.length,
    estimatedAddedValue: Math.round(totalEstimated),
    latestDraft: creep[creep.length - 1]?.result?.draftReply || null
  }
}
