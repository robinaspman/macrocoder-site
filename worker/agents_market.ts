interface AgentMetric {
  name: string
  stack: string
  avgCompletionMin: number
  firstPassSuccess: number
  costPerTaskUsd: number
  bestAt: string
}

const metrics: AgentMetric[] = [
  { name: 'Claude Sonnet 4.6', stack: 'nextjs', avgCompletionMin: 12, firstPassSuccess: 87, costPerTaskUsd: 0.34, bestAt: 'architecture, refactoring' },
  { name: 'Claude Opus 4.6', stack: 'nextjs', avgCompletionMin: 8, firstPassSuccess: 94, costPerTaskUsd: 1.2, bestAt: 'complex logic, debugging' },
  { name: 'Aider + Sonnet', stack: 'nextjs', avgCompletionMin: 15, firstPassSuccess: 79, costPerTaskUsd: 0.28, bestAt: 'bulk file changes, tests' },
  { name: 'Gemini 2.5 Pro', stack: 'nextjs', avgCompletionMin: 10, firstPassSuccess: 72, costPerTaskUsd: 0.08, bestAt: 'documentation, research' },
  { name: 'Claude Sonnet 4.6', stack: 'rust', avgCompletionMin: 14, firstPassSuccess: 84, costPerTaskUsd: 0.4, bestAt: 'modular refactors, safety' },
  { name: 'Claude Opus 4.6', stack: 'rust', avgCompletionMin: 9, firstPassSuccess: 91, costPerTaskUsd: 1.35, bestAt: 'unsafe boundaries, debugging' }
]

export function benchmarkAgents(stack: string) {
  const target = stack.toLowerCase()
  const rows = metrics.filter((m) => m.stack === target)
  return { stack: target, rows: rows.length ? rows : metrics.filter((m) => m.stack === 'nextjs') }
}

export function optimizeAgentPlan(input: { stack: string; task?: string }) {
  const bench = benchmarkAgents(input.stack).rows
  const fastest = [...bench].sort((a, b) => a.avgCompletionMin - b.avgCompletionMin)[0]
  const cheapest = [...bench].sort((a, b) => a.costPerTaskUsd - b.costPerTaskUsd)[0]
  const reliable = [...bench].sort((a, b) => b.firstPassSuccess - a.firstPassSuccess)[0]

  const totalCost = Number((fastest.costPerTaskUsd + cheapest.costPerTaskUsd + reliable.costPerTaskUsd).toFixed(2))
  const totalTime = fastest.avgCompletionMin + cheapest.avgCompletionMin + reliable.avgCompletionMin

  return {
    stack: input.stack,
    task: input.task || 'general delivery',
    routing: [
      { phase: 'plan', agent: reliable.name, reason: `highest first-pass success (${reliable.firstPassSuccess}%)` },
      { phase: 'implement', agent: fastest.name, reason: `fastest completion (${fastest.avgCompletionMin} min/task)` },
      { phase: 'test/docs', agent: cheapest.name, reason: `lowest marginal cost ($${cheapest.costPerTaskUsd}/task)` }
    ],
    estimate: {
      costUsd: totalCost,
      timeMin: totalTime
    }
  }
}
