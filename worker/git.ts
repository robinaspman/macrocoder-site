import type {
  Env,
  GitRecoverRequest,
  GitRecoverResponse,
  GitVerifyRequest,
  GitVerifyResponse
} from './types'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

export async function recoverGitHistory(
  request: GitRecoverRequest,
  env: Env
): Promise<GitRecoverResponse> {
  const engineUrl = env.MACROCODER_ENGINE_URL || 'http://localhost:8080'
  const apiKey = env.ADMIN_API_TOKEN

  const response = await fetch(`${engineUrl}/api/engine/git/recover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Git recovery failed: ${response.status} - ${error}`)
  }

  const result: ApiResponse<GitRecoverResponse> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Git recovery failed')
  }

  return result.data
}

export async function verifyGitHistory(
  request: GitVerifyRequest,
  env: Env
): Promise<GitVerifyResponse> {
  const engineUrl = env.MACROCODER_ENGINE_URL || 'http://localhost:8080'
  const apiKey = env.ADMIN_API_TOKEN

  const response = await fetch(`${engineUrl}/api/engine/git/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Git verification failed: ${response.status} - ${error}`)
  }

  const result: ApiResponse<GitVerifyResponse> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Git verification failed')
  }

  return result.data
}

export function parseGitUrl(url: string): { owner: string; repo: string } | null {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/\?#]+)/,
    /gitlab\.com\/([^\/]+)\/([^\/\?#]+)/,
    /bitbucket\.org\/([^\/]+)\/([^\/\?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '')
      }
    }
  }

  return null
}

export async function cloneWithRecovery(repoUrl: string, env: Env): Promise<GitRecoverResponse> {
  const parsed = parseGitUrl(repoUrl)
  const name = parsed?.repo || undefined

  return recoverGitHistory({ url: repoUrl, name }, env)
}
