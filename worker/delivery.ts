import type { LeadSummary, RepoSnapshot } from './types'

export interface DeliveryTask {
  id: string
  title: string
  category: 'security' | 'performance' | 'quality' | 'testing' | 'release'
  estimatedHours: number
  instructions: string
  status: 'pending' | 'running' | 'completed' | 'blocked'
}

export interface DeliveryPlan {
  projectId: string
  generatedAt: string
  mode: 'assist' | 'auto'
  tasks: DeliveryTask[]
  totalEstimatedHours: number
}

export function buildDeliveryPlan(projectId: string, summary: LeadSummary | null, snapshot: RepoSnapshot, mode: 'assist' | 'auto'): DeliveryPlan {
  const tasks: DeliveryTask[] = []
  const findings = summary?.key_findings || []

  if (findings.some((f) => /jwt|security|csp|tls|vulnerab/i.test(f))) {
    tasks.push(task('security-hardening', 'Security hardening pass', 'security', 4, 'Patch auth/session issues, add secure headers, validate token lifecycle.'))
  }

  if (findings.some((f) => /n\+1|load|performance|query|slow/i.test(f)) || (snapshot.harborSignals?.loadTimeMs || 0) > 2400) {
    tasks.push(task('perf-optimization', 'Performance optimization', 'performance', 8, 'Profile hot paths, optimize query patterns, reduce payload/render overhead.'))
  }

  if (snapshot.testSignals.testFileCount === 0 || findings.some((f) => /test|coverage/i.test(f))) {
    tasks.push(task('test-foundation', 'Testing foundation', 'testing', 12, 'Add integration tests for critical flows and baseline CI gates.'))
  }

  tasks.push(task('quality-refactor', 'Code quality refactor', 'quality', 6, 'Refactor high-risk modules and tighten typing/linting constraints.'))
  tasks.push(task('release-checklist', 'Release & handoff', 'release', 3, 'Prepare rollout checklist, monitoring hooks, and implementation notes.'))

  const deduped = dedupeTasks(tasks)
  const totalEstimatedHours = deduped.reduce((acc, t) => acc + t.estimatedHours, 0)

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    mode,
    tasks: deduped,
    totalEstimatedHours
  }
}

export function markTaskProgress(plan: DeliveryPlan, taskId: string, status: DeliveryTask['status']): DeliveryPlan {
  return {
    ...plan,
    tasks: plan.tasks.map((task) => (task.id === taskId ? { ...task, status } : task))
  }
}

function task(id: string, title: string, category: DeliveryTask['category'], estimatedHours: number, instructions: string): DeliveryTask {
  return { id, title, category, estimatedHours, instructions, status: 'pending' }
}

function dedupeTasks(tasks: DeliveryTask[]): DeliveryTask[] {
  const seen = new Set<string>()
  return tasks.filter((t) => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
}
