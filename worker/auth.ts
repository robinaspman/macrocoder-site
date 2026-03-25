import type { Env, TenantAccount } from './types'

const RATE_LIMIT = 20
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60

export async function validateProjectToken(projectId: string, token: string, env: Env): Promise<boolean> {
  if (!projectId || !token) return false
  const stored = await env.MACROCODER_KV.get(`token:${projectId}`)
  return stored === token
}

export async function registerProjectToken(projectId: string, token: string, env: Env): Promise<void> {
  await env.MACROCODER_KV.put(`token:${projectId}`, token)
}

export async function enforceRateLimit(
  projectId: string,
  ip: string,
  env: Env
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${projectId}:${ip || 'unknown'}`
  const now = Date.now()
  const raw = await env.MACROCODER_KV.get(key, 'json') as { count: number; windowStart: number } | null

  const withinWindow = raw && now - raw.windowStart < RATE_LIMIT_WINDOW_SECONDS * 1000
  const count = withinWindow ? raw.count : 0
  const windowStart = withinWindow ? raw.windowStart : now

  if (count >= RATE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: windowStart + RATE_LIMIT_WINDOW_SECONDS * 1000
    }
  }

  await env.MACROCODER_KV.put(
    key,
    JSON.stringify({ count: count + 1, windowStart }),
    { expirationTtl: RATE_LIMIT_WINDOW_SECONDS }
  )

  return {
    allowed: true,
    remaining: RATE_LIMIT - (count + 1),
    resetAt: windowStart + RATE_LIMIT_WINDOW_SECONDS * 1000
  }
}

export function isAdminAuthorized(request: Request, env: Env): boolean {
  if (!env.ADMIN_API_TOKEN) return false
  const header = request.headers.get('authorization') || ''
  return header === `Bearer ${env.ADMIN_API_TOKEN}`
}

export async function requireTenantApiKey(request: Request, env: Env): Promise<TenantAccount> {
  const apiKey = request.headers.get('x-api-key') || ''
  if (!apiKey) throw new Error('Missing API key')

  const tenantId = await env.MACROCODER_KV.get(`tenant-key:${apiKey}`)
  if (!tenantId) throw new Error('Invalid API key')

  const tenant = await env.MACROCODER_KV.get(`tenant:${tenantId}`, 'json') as TenantAccount | null
  if (!tenant) throw new Error('Unknown tenant')
  return tenant
}
