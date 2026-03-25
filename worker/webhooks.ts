import type { Env } from './types'

export type WebhookEvent =
  | 'client.connected'
  | 'chat.started'
  | 'chat.completed'
  | 'chat.abandoned'
  | 'budget.disclosed'
  | 'followup.due'

export async function emitWebhook(event: WebhookEvent, payload: Record<string, unknown>, env: Env): Promise<void> {
  const targets = [env.DISCORD_WEBHOOK_URL, env.SLACK_WEBHOOK_URL].filter(Boolean) as string[]
  if (!targets.length) return

  const content = `MacroCoder ${event}\n${JSON.stringify(payload, null, 2)}`
  await Promise.allSettled(
    targets.map((url) =>
      fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: content, content })
      })
    )
  )
}
