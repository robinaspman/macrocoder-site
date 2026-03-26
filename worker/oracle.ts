import type { PricingBenchmark } from './pricing'
import type { RepoSnapshot } from './types'

const marketRates: Record<string, { low: number; high: number }> = {
  nextjs: { low: 70, high: 105 },
  rust: { low: 90, high: 140 },
  python: { low: 65, high: 110 },
  default: { low: 60, high: 95 }
}

const geoAdjustments: Record<string, number> = {
  us: 1.08,
  eu: 1.0,
  asia: 0.85,
  australia: 1.12
}

export function queryPricingOracle(input: { question: string; stack: string; geo?: string; budget?: string; marketBlend?: { blendedLow: number; blendedHigh: number; sampleSize: number } }, benchmark: PricingBenchmark) {
  const stackKey = input.stack.toLowerCase()
  const market = marketRates[stackKey] || marketRates.default
  const geo = (input.geo || 'eu').toLowerCase()
  const adjust = geoAdjustments[geo] || 1

  const marketLow = input.marketBlend?.sampleSize ? input.marketBlend.blendedLow : market.low
  const marketHigh = input.marketBlend?.sampleSize ? input.marketBlend.blendedHigh : market.high
  const low = Math.round(((marketLow + benchmark.avgRate) / 2) * adjust)
  const high = Math.round(((marketHigh + benchmark.avgRate) / 2) * adjust)
  const recommended = Math.round((low + high) / 2)

  return {
    question: input.question,
    recommendation: {
      hourlyRange: `$${low}-${high}/hr`,
      recommendedRate: `$${recommended}/hr`,
      projectedWinRate: projectedWinRate(recommended, benchmark.avgRate),
      benchmarkSampleSize: benchmark.sampleSize,
      marketSampleSize: input.marketBlend?.sampleSize || 0
    },
    notes: [
      'Range blends your historical closes with external market priors.',
      `Geographic adjustment: ${geo.toUpperCase()} (${adjust}x).`,
      input.budget ? `Client budget signal received: ${input.budget}.` : 'No explicit client budget provided.'
    ]
  }
}

function projectedWinRate(targetRate: number, baselineRate: number): string {
  const delta = targetRate - baselineRate
  const rate = Math.max(22, Math.min(78, 58 - delta * 0.4))
  return `${rate.toFixed(1)}%`
}

export function scoreClientLtv(snapshot: RepoSnapshot | null | undefined, conversation: unknown) {
  const repoActive = (snapshot?.fileTree?.length || 0) > 120
  const teamSignal = (snapshot?.clientIntelligence?.orgMemberCount || 1) >= 3
  const spend = String(snapshot?.upworkIntelligence?.clientSpend || '')
  const hasSpend = /\$\s?\d/.test(spend)
  const ongoingSignal = JSON.stringify(conversation || {}).toLowerCase().includes('ongoing')

  let score = 30
  const reasons: string[] = []
  if (repoActive) { score += 20; reasons.push('Active/large repository suggests ongoing roadmap.') }
  if (teamSignal) { score += 18; reasons.push('Multi-contributor team detected.') }
  if (hasSpend) { score += 15; reasons.push('Client has meaningful prior spend signal.') }
  if (ongoingSignal) { score += 14; reasons.push('Conversation contains recurring/ongoing language.') }

  const verdict = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low'
  return { score: Math.min(99, score), verdict, reasons }
}
