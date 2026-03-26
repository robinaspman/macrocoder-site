// GitHub OAuth configuration
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || ''
const REDIRECT_URI = `${window.location.origin}/macrocoder-site/connect/callback`

export interface GitHubTokenResponse {
  access_token: string
  token_type: string
  scope: string
}

export interface RepoSnapshot {
  name: string
  description: string | null
  tree: RepoTreeNode[]
  packageJson: PackageJson | null
  readme: string | null
  keyFiles: Record<string, string>
}

export interface RepoTreeNode {
  path: string
  type?: string
  size?: number
}

export interface PackageJson {
  homepage?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

interface RepoMeta {
  name: string
  description: string | null
  default_branch?: string
}

interface ContentResponse {
  content?: string
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

// Generate random state for OAuth security
function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Start GitHub OAuth flow
export function startGitHubAuth(projectId: string): void {
  const state = generateState()

  // Store state and project ID in sessionStorage for verification
  sessionStorage.setItem('oauth_state', state)
  sessionStorage.setItem('oauth_project_id', projectId)

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'repo:read',
    state: state
  })

  window.location.href = `https://github.com/login/oauth/authorize?${params}`
}

// Handle OAuth callback
export async function handleGitHubCallback(
  code: string,
  state: string,
  workerUrl: string
): Promise<{ token: string; projectId: string }> {
  const storedState = sessionStorage.getItem('oauth_state')
  const projectId = sessionStorage.getItem('oauth_project_id')

  if (!storedState || storedState !== state) {
    throw new Error('Invalid OAuth state')
  }

  if (!projectId) {
    throw new Error('Project ID not found')
  }

  // Exchange code for token via Cloudflare Worker
  // (GitHub doesn't allow client-side token exchange for security)
  const response = await fetch(`${workerUrl}/github/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  const data = await response.json() as GitHubTokenResponse

  // Clear OAuth state
  sessionStorage.removeItem('oauth_state')
  sessionStorage.removeItem('oauth_project_id')

  return { token: data.access_token, projectId }
}

// Fetch repository snapshot
export async function fetchRepoSnapshot(
  token: string,
  owner: string,
  repo: string
): Promise<RepoSnapshot> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json'
  }

  // Fetch repo info
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers
  })

  if (!repoResponse.ok) {
    throw new Error('Failed to fetch repository')
  }

  const repoData = await repoResponse.json() as RepoMeta

  // Fetch file tree
  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`,
    { headers }
  )

  const treeData = (treeResponse.ok ? await treeResponse.json() : { tree: [] }) as {
    tree?: RepoTreeNode[]
  }

  // Try to fetch package.json
  let packageJson = null
  try {
    const pkgResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      { headers }
    )
    if (pkgResponse.ok) {
      const pkgData = await pkgResponse.json() as ContentResponse
      const parsed = JSON.parse(atob(pkgData.content || ''))
      packageJson = asObject(parsed) as PackageJson | null
    }
  } catch {
    // No package.json
  }

  // Try to fetch README
  let readme = null
  try {
    const readmeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers
    })
    if (readmeResponse.ok) {
      const readmeData = await readmeResponse.json() as ContentResponse
      readme = atob(readmeData.content || '')
    }
  } catch {
    // No README
  }

  // Fetch key config files
  const keyFiles: Record<string, string> = {}
  const keyFilePaths = [
    'Dockerfile',
    'docker-compose.yml',
    'Cargo.toml',
    'requirements.txt',
    'Gemfile',
    'go.mod'
  ]

  for (const path of keyFilePaths) {
    try {
      const fileResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        { headers }
      )
      if (fileResponse.ok) {
        const fileData = await fileResponse.json() as ContentResponse
        keyFiles[path] = atob(fileData.content || '')
      }
    } catch {
      // File doesn't exist
    }
  }

  return {
    name: repoData.name,
    description: repoData.description,
    tree: treeData.tree || [],
    packageJson,
    readme,
    keyFiles
  }
}
