import type { Env } from './types'

export async function listLeads(env: Env): Promise<any[]> {
  const list = await env.MACROCODER_KV.list({ prefix: 'conversation:' })
  const items: any[] = []

  for (const key of list.keys) {
    const raw = await env.MACROCODER_KV.get(key.name, 'json') as any
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

export async function getLead(env: Env, projectId: string): Promise<any | null> {
  return env.MACROCODER_KV.get(`conversation:${projectId}`, 'json')
}
