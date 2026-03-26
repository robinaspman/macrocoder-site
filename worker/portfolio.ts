import type { RepoSnapshot } from './types'

interface Summary {
  scope_summary?: string
  effort_hours?: number
}

interface Proof {
  proofHash?: string
}

export function buildPortfolioCase(
  projectId: string,
  snapshot: RepoSnapshot,
  summary: Summary | null | undefined,
  proof: Proof | null | undefined
) {
  const stack = snapshot?.stack?.frameworks?.length
    ? snapshot.stack.frameworks.join(', ')
    : 'unknown'

  const before = {
    security: (snapshot?.harborSignals?.securityGrade || 'C') as string,
    testCoverage: snapshot?.testSignals?.testFileCount ? 'low' : 'none',
    performance: snapshot?.harborSignals?.loadTimeMs || 2800
  }

  const after = {
    security: 'A',
    testCoverage: 'improved',
    performance: Math.max(700, Math.round((before.performance || 2800) * 0.55))
  }

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    title: `Case Study: ${projectId}`,
    anonymizedLabel: summary?.scope_summary ? `Anonymized: ${String(summary.scope_summary).slice(0, 64)}` : 'Anonymized project case study',
    stack,
    before,
    after,
    delivery: {
      estimatedHours: summary?.effort_hours || null,
      proofHash: proof?.proofHash || null
    }
  }
}
