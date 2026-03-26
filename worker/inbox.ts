import type { Env } from './types'

interface LeadConversation {
  projectId?: string
  clientName?: string
  timestamp?: string
  structuredSummary?: unknown
  conversation?: unknown[]
}

interface LeadListItem {
  projectId?: string
  client: string
  timestamp?: string
  summary: unknown
  messageCount: number
}

export async function listLeads(env: Env): Promise<LeadListItem[]> {
  const list = await env.MACROCODER_KV.list({ prefix: 'conversation:' })
  const items: LeadListItem[] = []

  for (const key of list.keys) {
    const raw = await env.MACROCODER_KV.get<LeadConversation>(key.name, 'json')
    if (!raw) continue
    items.push({
      projectId: raw.projectId,
      client: raw.clientName || 'unknown',
      timestamp: raw.timestamp,
      summary: raw.structuredSummary || null,
      messageCount: Array.isArray(raw.conversation) ? raw.conversation.length : 0
    })
  }

  return items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
}

export async function getLead(env: Env, projectId: string): Promise<LeadConversation | null> {
  return env.MACROCODER_KV.get<LeadConversation>(`conversation:${projectId}`, 'json')
}
