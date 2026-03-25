import type { Env } from './types'

export interface PricingBenchmark {
  stack: string
  avgHours: number
  avgRate: number
  sampleSize: number
}

export async function getPricingBenchmark(env: Env, stack: string[]): Promise<PricingBenchmark> {
  const stackKey = stack.slice().sort().join('+') || 'default'
  const key = `pricing:${stackKey}`
  const stored = await env.MACROCODER_KV.get(key, 'json') as PricingBenchmark | null
  if (stored) return stored

  const global = await env.MACROCODER_KV.get(`pricing-global:${stackKey}`, 'json') as PricingBenchmark | null
  if (global) return global

  const fallback = await env.MACROCODER_KV.get('pricing:default', 'json') as PricingBenchmark | null
  if (fallback) return { ...fallback, stack: stackKey }

  return {
    stack: stackKey,
    avgHours: 40,
    avgRate: 80,
    sampleSize: 1
  }
}

export async function ingestGlobalBenchmark(
  env: Env,
  payload: { stack: string; actualHours: number; rate: number }
): Promise<PricingBenchmark> {
  const stackKey = payload.stack.trim() || 'default'
  const key = `pricing-global:${stackKey}`
  const existing = await env.MACROCODER_KV.get(key, 'json') as PricingBenchmark | null

  if (!existing) {
    const created: PricingBenchmark = {
      stack: stackKey,
      avgHours: payload.actualHours,
      avgRate: payload.rate,
      sampleSize: 1
    }
    await env.MACROCODER_KV.put(key, JSON.stringify(created))
    return created
  }

  const nextSample = existing.sampleSize + 1
  const next: PricingBenchmark = {
    stack: stackKey,
    avgHours: ((existing.avgHours * existing.sampleSize) + payload.actualHours) / nextSample,
    avgRate: ((existing.avgRate * existing.sampleSize) + payload.rate) / nextSample,
    sampleSize: nextSample
  }

  await env.MACROCODER_KV.put(key, JSON.stringify(next))
  return next
}

export function estimateEffortFromBenchmark(benchmark: PricingBenchmark, complexitySignals: number) {
  const scaled = 1 + Math.max(0, Math.min(complexitySignals, 5)) * 0.12
  const hours = Math.max(8, Math.round(benchmark.avgHours * scaled))
  const low = Math.round(benchmark.avgRate * 0.9)
  const high = Math.round(benchmark.avgRate * 1.1)
  return {
    hours,
    estimate: `$${hours * benchmark.avgRate}`,
    rateBand: `$${low}-${high}/hr`
  }
}
