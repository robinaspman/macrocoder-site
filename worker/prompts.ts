import type { ConversationState, RepoSnapshot } from './types'

export type PromptVariant = 'v1-consultative' | 'v2-direct' | 'v3-educational' | 'v4-urgency'

const VARIANTS: Record<PromptVariant, string> = {
  'v1-consultative': 'Let me understand your needs first and collaboratively shape scope, budget, and timeline.',
  'v2-direct': 'Be direct: identify top issues fast and propose concrete fixes with effort estimates.',
  'v3-educational': 'Teach while advising: explain why each issue matters and how to address it safely.',
  'v4-urgency': 'Prioritize urgency and risk reduction for exploitable vulnerabilities and production blockers.'
}

export function choosePromptVariant(seed: number): PromptVariant {
  const variants: PromptVariant[] = ['v1-consultative', 'v2-direct', 'v3-educational', 'v4-urgency']
  return variants[Math.abs(seed) % variants.length]
}

export function composePromptByVariant(
  variant: PromptVariant,
  basePrompt: string,
  snapshot: RepoSnapshot,
  state: ConversationState
): string {
  const intelligence = snapshot.clientIntelligence
  const intelligenceText = intelligence
    ? `Client intelligence: ${intelligence.summary}\nOrg members: ${intelligence.orgMemberCount || 'unknown'}; repositories: ${intelligence.repoCount || 'unknown'}.`
    : 'Client intelligence: pending collection.'

  return [
    `Prompt Variant: ${variant}`,
    `Style directive: ${VARIANTS[variant]}`,
    intelligenceText,
    `Conversation completion score: ${state.completionScore}%`,
    basePrompt
  ].join('\n\n')
}
