import type { UpworkIntelligence } from './types'

export async function analyzeUpworkJob(jobUrl: string): Promise<UpworkIntelligence> {
  try {
    const response = await fetch(jobUrl, { headers: { 'User-Agent': 'MacroCoder-Worker' } })
    const html = response.ok ? await response.text() : ''
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    const extractedBudget = text.match(/\$\s?\d[\d,]*(?:\s?-\s?\$?\d[\d,]*)?/)?.[0]
    const proposalCount = toInt(text.match(/(\d+)\s+proposals?/i)?.[1])
    const clientSpend = text.match(/\$\s?\d[\d,]*\+?\s+spent/i)?.[0]
    const clientRating = text.match(/(\d(?:\.\d)?)\s*(?:out of 5|\/5|rating)/i)?.[1]
    const requiredSkills = extractSkills(text)

    const requirementSignal = deriveRequirementSignal(text)
    const competitionLevel = proposalCount && proposalCount > 20 ? 'high' : proposalCount && proposalCount > 8 ? 'medium' : 'low'
    const spendingSignal = deriveSpendingSignal(clientSpend)

    return {
      jobUrl,
      extractedBudget,
      proposalCount,
      clientSpend,
      clientRating,
      requiredSkills,
      skills: requiredSkills,
      requirementSignal,
      competitionLevel,
      spendingSignal,
      historicalPayHint: deriveHistoricalPayHint(extractedBudget, clientSpend),
      summary: summarizeJobText(text, proposalCount, clientSpend, extractedBudget),
      analyzedAt: new Date().toISOString()
    }
  } catch {
    return {
      jobUrl,
      requiredSkills: [],
      skills: [],
      requirementSignal: 'medium',
      competitionLevel: 'medium',
      spendingSignal: 'unknown',
      summary: 'Unable to scrape Upwork listing; fallback to manual review recommended.',
      analyzedAt: new Date().toISOString()
    }
  }
}

function extractSkills(text: string): string[] {
  const known = ['next.js', 'react', 'typescript', 'prisma', 'node', 'postgresql', 'aws', 'docker', 'security', 'redis', 'graphql', 'stripe']
  return known.filter((k) => new RegExp(`\\b${k.replace('.', '\\.')}\\b`, 'i').test(text))
}

function summarizeJobText(text: string, proposalCount?: number, clientSpend?: string, budget?: string): string {
  const summary = text.slice(0, 220).trim() || 'No readable job content extracted.'
  const parts = [summary]
  if (proposalCount) parts.push(`Competition: ${proposalCount} proposals.`)
  if (clientSpend) parts.push(`Client spend signal: ${clientSpend}.`)
  if (budget) parts.push(`Listed budget: ${budget}.`)
  return parts.join(' ')
}

function deriveRequirementSignal(text: string): 'low' | 'medium' | 'high' {
  const detailed = /architecture|scalability|security audit|multi-tenant|distributed|compliance/i.test(text)
  const light = /bug fix|small task|quick fix|minor/i.test(text)
  if (detailed) return 'high'
  if (light) return 'low'
  return 'medium'
}

function deriveSpendingSignal(spend?: string): 'unknown' | 'low' | 'mid' | 'high' {
  if (!spend) return 'unknown'
  const amount = toInt(spend.replace(/[^\d]/g, ''))
  if (!amount) return 'unknown'
  if (amount >= 30000) return 'high'
  if (amount >= 5000) return 'mid'
  return 'low'
}

function deriveHistoricalPayHint(budget?: string, spend?: string): string | undefined {
  if (!budget && !spend) return undefined
  if (spend && /\$\s?\d[\d,]*\+?\s+spent/i.test(spend)) {
    return 'Client has meaningful prior spend; consider value-forward proposal instead of lowest bid.'
  }
  if (budget) {
    return 'Budget may be anchoring low; suggest phased delivery with measurable milestones.'
  }
  return undefined
}

function toInt(value?: string): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}
