import type { RepoSnapshot } from './types'

interface HuntInput {
  stacks: string[]
  budgetMin: number
  clientsVerified: boolean
}

interface FeedJob {
  jobId: string
  title: string
  stack: string[]
  budgetUsd: number
  budget: string
  clientVerified: boolean
  proposalCount: number
  clientSpend: number
}

interface HuntRecommendation {
  job_id: string
  title: string
  budget: string
  client_verified: boolean
  proposal_count: number
  conversion_probability: number
  recommendation: string
}

interface HuntSkippedItem {
  title: string
  reason: string
}

export function runGhostHunt(input: HuntInput, snapshot?: RepoSnapshot) {
  const stacks = input.stacks.map((s) => s.toLowerCase())
  const recommendations: HuntRecommendation[] = []
  const skipped: HuntSkippedItem[] = []

  for (const job of deriveFeed(snapshot)) {
    const stackFit = overlap(stacks, job.stack)
    const belowBudget = job.budgetUsd < input.budgetMin
    const notVerified = input.clientsVerified && !job.clientVerified

    if (belowBudget || notVerified || stackFit === 0) {
      skipped.push({
        title: job.title,
        reason: belowBudget
          ? `Below threshold (${job.budget} < $${input.budgetMin})`
          : notVerified
            ? 'Client not verified'
            : 'Low stack fit'
      })
      continue
    }

    const conversion = estimateConversion(job, stackFit, snapshot)
    recommendations.push({
      job_id: job.jobId,
      title: job.title,
      budget: job.budget,
      client_verified: job.clientVerified,
      proposal_count: job.proposalCount,
      conversion_probability: conversion,
      recommendation: conversion >= 70
        ? 'Apply within 2 hours; early-window advantage detected.'
        : 'Queue for review; solid but not top-priority.'
    })
  }

  recommendations.sort((a, b) => b.conversion_probability - a.conversion_probability)

  return {
    run_at: new Date().toISOString(),
    recommendations,
    skipped,
    feed_size: recommendations.length + skipped.length
  }
}

function deriveFeed(snapshot?: RepoSnapshot): FeedJob[] {
  const intel = snapshot?.upworkIntelligence
  if (!intel || !intel.jobUrl) {
    return []
  }

  return [
    {
      jobId: intel.jobUrl,
      title: intel.summary || 'Upwork opportunity',
      stack: intel.requiredSkills.length > 0 ? intel.requiredSkills : intel.skills,
      budgetUsd: parseBudgetUsd(intel.extractedBudget),
      budget: intel.extractedBudget || '$0',
      clientVerified: (intel.clientRating || '').length > 0,
      proposalCount: Number(intel.proposalCount || 0),
      clientSpend: parseBudgetUsd(intel.clientSpend)
    }
  ]
}

function parseBudgetUsd(input?: string): number {
  if (!input) return 0
  const matches = input.match(/\d[\d,]*/g)
  if (!matches || matches.length === 0) return 0
  const values = matches
    .map((n) => Number(n.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (values.length === 0) return 0
  return Math.max(...values)
}

function overlap(a: string[], b: string[]) {
  const set = new Set(a)
  return b.filter((x) => set.has(x.toLowerCase())).length
}

function estimateConversion(job: FeedJob, stackFit: number, snapshot?: RepoSnapshot): number {
  const proposalPressure = Math.max(0, 20 - job.proposalCount)
  const spendSignal = job.clientSpend > 30000 ? 12 : job.clientSpend > 5000 ? 7 : 2
  const fitSignal = Math.min(25, stackFit * 10)
  const repoBonus = snapshot?.fileTree?.length ? 8 : 0
  return Math.max(12, Math.min(94, 35 + proposalPressure + spendSignal + fitSignal + repoBonus))
}
