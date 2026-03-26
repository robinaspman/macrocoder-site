import type { Env, RepoSnapshot } from './types'

interface GitHubTokenRequest {
  code: string
}

interface GitHubTokenExchangeResponse {
  access_token?: string
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

interface GitHubRepoMeta {
  default_branch?: string
}

interface GitHubTreeNode {
  type?: string
  path?: string
  size?: number
}

interface GitHubTreeResponse {
  tree?: GitHubTreeNode[]
}

interface GitHubContentResponse {
  content?: string
}

type JsonObject = Record<string, unknown>

const GITHUB_API = 'https://api.github.com'

export async function exchangeGitHubToken(
  body: GitHubTokenRequest,
  env: Env
): Promise<GitHubTokenExchangeResponse> {
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: body.code
    })
  })

  if (!tokenResponse.ok) {
    throw new Error(`GitHub token exchange failed: ${await tokenResponse.text()}`)
  }

  return tokenResponse.json()
}

export async function buildRepoSnapshot(owner: string, repo: string, ghToken: string): Promise<RepoSnapshot> {
  const headers = githubHeaders(ghToken)

  const repoMeta = await githubJson<GitHubRepoMeta>(`${GITHUB_API}/repos/${owner}/${repo}`, headers)
  const branch = repoMeta.default_branch || 'main'

  const tree = await githubJson<GitHubTreeResponse>(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, headers)
  const files = (tree.tree || []).filter((n): n is GitHubTreeNode & { type: 'blob'; path: string } => n.type === 'blob' && typeof n.path === 'string')
  const fileTree = files.map((f) => f.path)

  const topSourceCandidates = files
    .filter((f) => /\.(ts|tsx|js|jsx|rs|py|go|java|kt|swift|php)$/i.test(f.path))
    .sort((a, b) => (b.size || 0) - (a.size || 0))
    .slice(0, 10)

  const topSourceFiles = await Promise.all(
    topSourceCandidates.map(async (f) => {
      const snippet = await fetchFileSnippet(owner, repo, branch, f.path, headers)
      return { path: f.path, size: f.size || 0, snippet }
    })
  )

  const packageJson = fileTree.includes('package.json')
    ? await fetchJsonFile(owner, repo, branch, 'package.json', headers)
    : null
  const readme = await fetchReadme(owner, repo, headers)

  const dependencies = [
    ...Object.keys(packageJson?.dependencies || {}),
    ...Object.keys(packageJson?.devDependencies || {})
  ]

  return {
    owner,
    repo,
    branch,
    capturedAt: new Date().toISOString(),
    fileTree,
    topSourceFiles,
    testSignals: {
      hasTestsDir: fileTree.some((p) => p.includes('__tests__/')),
      testFileCount: fileTree.filter((p) => /\.(test|spec)\.[a-z]+$/i.test(p)).length
    },
    ciSignals: {
      workflowFiles: fileTree.filter((p) => p.startsWith('.github/workflows/'))
    },
    stack: detectStack(fileTree, packageJson),
    dependencySummary: {
      totalDependencies: dependencies.length,
      outdatedHints: findOutdatedHints(dependencies)
    },
    detectedSiteUrl: detectSiteUrl(packageJson, readme),
    readmeContent: readme.slice(0, 20000)
  }
}

function githubHeaders(ghToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${ghToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'MacroCoder-Worker'
  }
}

async function githubJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`GitHub API failed (${response.status}): ${await response.text()}`)
  return response.json<T>()
}

async function fetchFileSnippet(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  headers: Record<string, string>
): Promise<string | undefined> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, { headers })
  if (!response.ok) return undefined
  const payload = await response.json<GitHubContentResponse>()
  if (!payload.content) return undefined
  const decoded = decodeBase64(payload.content)
  return decoded.slice(0, 1200)
}

async function fetchJsonFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  headers: Record<string, string>
): Promise<JsonObject | null> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, { headers })
  if (!response.ok) return null

  const payload = await response.json<GitHubContentResponse>()
  if (!payload.content) return null

  try {
    const parsed = JSON.parse(decodeBase64(payload.content))
    return (typeof parsed === 'object' && parsed !== null) ? (parsed as JsonObject) : null
  } catch {
    return null
  }
}

function decodeBase64(value: string): string {
  try {
    return atob(value.replace(/\n/g, ''))
  } catch {
    return ''
  }
}

function detectStack(fileTree: string[], packageJson: JsonObject | null) {
  const frameworks = new Set<string>()
  const languages = new Set<string>()
  const packageManagers = new Set<string>()

  const deps = asStringMap(packageJson?.dependencies)

  if (fileTree.some((p) => p === 'next.config.js' || p === 'next.config.mjs')) frameworks.add('nextjs')
  if (fileTree.some((p) => p.includes('nuxt.config'))) frameworks.add('nuxt')
  if (fileTree.some((p) => p.includes('prisma/schema.prisma'))) frameworks.add('prisma')
  if (fileTree.some((p) => p.includes('svelte.config'))) frameworks.add('svelte')
  if (deps?.react) frameworks.add('react')
  if (deps?.express) frameworks.add('express')

  if (fileTree.some((p) => p.endsWith('.rs'))) languages.add('rust')
  if (fileTree.some((p) => p.endsWith('.ts') || p.endsWith('.tsx'))) languages.add('typescript')
  if (fileTree.some((p) => p.endsWith('.js') || p.endsWith('.jsx'))) languages.add('javascript')
  if (fileTree.some((p) => p.endsWith('.py'))) languages.add('python')

  if (fileTree.includes('package-lock.json')) packageManagers.add('npm')
  if (fileTree.includes('pnpm-lock.yaml')) packageManagers.add('pnpm')
  if (fileTree.includes('yarn.lock')) packageManagers.add('yarn')

  return {
    frameworks: [...frameworks],
    languages: [...languages],
    packageManagers: [...packageManagers]
  }
}

function findOutdatedHints(dependencies: string[]): string[] {
  const hints: string[] = []
  const suspicious = ['request', 'left-pad', 'tslint', 'node-sass']
  for (const dep of suspicious) {
    if (dependencies.includes(dep)) hints.push(`${dep} is often outdated/deprecated`)
  }
  return hints
}


async function fetchReadme(owner: string, repo: string, headers: Record<string, string>): Promise<string> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, { headers })
  if (!response.ok) return ''
  const payload = await response.json<GitHubContentResponse>()
  if (!payload.content) return ''
  return decodeBase64(payload.content)
}

function detectSiteUrl(packageJson: JsonObject | null, readme: string): string | undefined {
  const homepage = packageJson?.homepage
  if (typeof homepage === 'string' && /^https?:\/\//.test(homepage)) return homepage

  const match = readme.match(/https?:\/\/[\w.-]+(?:\/[\w./?%&=-]*)?/i)
  if (match) return match[0]
  return undefined
}

function asStringMap(value: unknown): Record<string, string> | null {
  if (typeof value !== 'object' || value === null) return null
  const out: Record<string, string> = {}
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') out[key] = item
  }
  return out
}
