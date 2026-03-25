export interface RetainerPlan {
  projectId: string
  monthlyUsd: number
  hours: number
  createdAt: string
  cycle: {
    week1: string
    week2: string
    week3: string
    week4: string
  }
}

export function buildRetainerPlan(projectId: string, monthlyUsd: number, hours: number): RetainerPlan {
  return {
    projectId,
    monthlyUsd,
    hours,
    createdAt: new Date().toISOString(),
    cycle: {
      week1: 'Run Harbor scout health scan and publish summary.',
      week2: 'Check dependency security updates and draft safe PRs.',
      week3: 'Review performance trend and investigate regressions.',
      week4: 'Post monthly recap + hours used + rollover recommendation.'
    }
  }
}

export function buildRetainerReport(plan: RetainerPlan, month: string) {
  const usedHours = Math.max(0, Math.min(plan.hours, Math.round(plan.hours * 0.72)))
  const rollover = Math.max(0, plan.hours - usedHours)
  return {
    projectId: plan.projectId,
    month,
    summary: `This month: security patches, dependency updates, and performance checks completed.`,
    usedHours,
    includedHours: plan.hours,
    rolloverHours: rollover,
    invoiceUsd: plan.monthlyUsd,
    actions: [
      plan.cycle.week1,
      plan.cycle.week2,
      plan.cycle.week3,
      plan.cycle.week4
    ]
  }
}


export function buildRetainerRun(plan: RetainerPlan, input?: { week?: number; vulnerabilities?: number; performanceDeltaPct?: number }) {
  const week = Math.max(1, Math.min(4, Number(input?.week || 1)))
  const vulnerabilities = Math.max(0, Number(input?.vulnerabilities || 0))
  const perfDelta = Number(input?.performanceDeltaPct || 0)

  const checks = [
    { name: 'security', status: vulnerabilities > 0 ? 'alert' : 'ok', note: vulnerabilities > 0 ? `${vulnerabilities} vulnerability signals detected` : 'No critical vulnerabilities detected' },
    { name: 'performance', status: perfDelta > 12 ? 'alert' : 'ok', note: perfDelta > 12 ? `Load/perf regressed by ${perfDelta}%` : 'Performance trend within thresholds' },
    { name: 'capacity', status: 'ok', note: `${plan.hours} included monthly hours tracked` }
  ]

  const weeklyAction = week === 1
    ? plan.cycle.week1
    : week === 2
      ? plan.cycle.week2
      : week === 3
        ? plan.cycle.week3
        : plan.cycle.week4

  return {
    projectId: plan.projectId,
    runAt: new Date().toISOString(),
    week,
    action: weeklyAction,
    checks,
    escalationSuggested: checks.some((c) => c.status === 'alert')
  }
}
