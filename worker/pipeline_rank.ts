export interface PipelineLead {
  projectId: string
  client: string
  ltvScore: number
  conversionProbability: number
  budget?: string
  recommendation: string
}

export function rankPipeline(leads: PipelineLead[]) {
  const rows = [...leads].map((l) => ({
    ...l,
    priorityScore: Math.round((l.ltvScore * 0.55) + (l.conversionProbability * 0.45))
  }))

  rows.sort((a, b) => b.priorityScore - a.priorityScore)

  return {
    generatedAt: new Date().toISOString(),
    leads: rows,
    top: rows.slice(0, 5)
  }
}
