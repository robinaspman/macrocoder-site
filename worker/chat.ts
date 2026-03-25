import type { ChatMessage, ConversationState, Env, RepoSnapshot } from './types'
import { runQuickAnalysis } from './analysis'

export async function getConversationState(projectId: string, env: Env): Promise<ConversationState> {
  const key = `state:${projectId}`
  const stored = await env.MACROCODER_KV.get(key, 'json') as ConversationState | null
  if (stored) return stored
  return {
    projectId,
    stage: 'intake',
    askedScope: false,
    askedBudget: false,
    askedTimeline: false,
    offTopicCount: 0,
    completionScore: 0,
    lastUpdated: new Date().toISOString()
  }
}

export async function saveConversationState(state: ConversationState, env: Env): Promise<void> {
  await env.MACROCODER_KV.put(`state:${state.projectId}`, JSON.stringify(state), { expirationTtl: 60 * 60 * 24 * 30 })
}

export function buildSystemPrompt(input: {
  projectId: string
  snapshot: RepoSnapshot
  state: ConversationState
  pricingContext: { avgHours: number; sampleSize: number }
}): string {
  const quick = runQuickAnalysis(input.snapshot)
  const harborContext = input.snapshot.harborSignals
    ? `Live Site: ${input.snapshot.harborSignals.targetUrl}, security grade ${input.snapshot.harborSignals.securityGrade || 'unknown'}, load ${input.snapshot.harborSignals.loadTimeMs || 'n/a'}ms`
    : 'Live Site: no Harbor scan yet'
  const upworkContext = input.snapshot.upworkIntelligence
    ? `Upwork: proposals=${input.snapshot.upworkIntelligence.proposalCount || 'unknown'}, spend=${input.snapshot.upworkIntelligence.clientSpend || 'unknown'}, budget=${input.snapshot.upworkIntelligence.extractedBudget || 'unknown'}, competition=${input.snapshot.upworkIntelligence.competitionLevel}`
    : 'Upwork: no listing intelligence attached'
  const findings = [quick.testCoverageSignal, quick.ciSignal, ...quick.qualitySignals].filter(Boolean)

  return [
    'You are MacroCoder\'s pre-sales analyst and technical negotiator.',
    `Project ID: ${input.projectId}`,
    `Stack Context: ${quick.stackLabel}`,
    `Detected Issues: ${findings.join('; ')}`,
    harborContext,
    upworkContext,
    `Historical Pricing: Similar projects averaged ${input.pricingContext.avgHours} hours (sample size ${input.pricingContext.sampleSize}).`,
    `Conversation stage: ${input.state.stage}. Completion score: ${input.state.completionScore}%`,
    'Rules:',
    '- Ask scope, budget, and timeline if missing.',
    '- If budget appears below estimate, suggest phased delivery.',
    '- If client goes off-topic twice, steer back to scope clarity.',
    '- If completion score > 85%, output concise recap and ask for sign-off.',
    '- Reference concrete repo observations from provided snapshot.'
  ].join('\n')
}

export function evolveConversationState(state: ConversationState, latestUserMessage: string): ConversationState {
  const text = latestUserMessage.toLowerCase()
  const next = { ...state }

  if (/scope|build|feature|refactor|fix/.test(text)) next.askedScope = true
  if (/budget|\$|cost|price/.test(text)) next.askedBudget = true
  if (/timeline|deadline|week|month|asap/.test(text)) next.askedTimeline = true

  if (next.askedScope && next.stage === 'intake') next.stage = 'scope'
  if (next.askedBudget && next.stage !== 'synthesis') next.stage = 'budget'
  if (next.askedTimeline && next.stage !== 'synthesis') next.stage = 'timeline'

  if (!/scope|budget|timeline|feature|deadline|cost|refactor/.test(text)) {
    next.offTopicCount += 1
  }

  if (next.askedScope && next.askedBudget && next.askedTimeline) next.stage = 'synthesis'

  const completed = [next.askedScope, next.askedBudget, next.askedTimeline].filter(Boolean).length
  next.completionScore = Math.min(100, Math.round((completed / 3) * 100))
  next.lastUpdated = new Date().toISOString()
  return next
}

export async function callClaude(env: Env, system: string, messages: ChatMessage[]): Promise<Response> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      temperature: 0.2,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content }))
    })
  })

  if (!response.ok) {
    throw new Error(`Claude API error: ${await response.text()}`)
  }

  return response
}
