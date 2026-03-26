import type { ClientIntelligence, RepoSnapshot } from './types'

const GITHUB_API = 'https://api.github.com'

interface GitHubProfile {
  public_repos?: number
  followers?: number
}

interface GitHubRepo {
  stargazers_count?: number
  language?: string | null
}

interface GitHubOrg {
  id?: number
}

export async function gatherClientIntelligence(snapshot: RepoSnapshot, githubToken?: string): Promise<ClientIntelligence> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'MacroCoder-Worker'
  }
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`

  const owner = snapshot.owner
  const profile = await safeJson<GitHubProfile>(`${GITHUB_API}/users/${owner}`, headers)
  const repos = await safeJson<GitHubRepo[]>(`${GITHUB_API}/users/${owner}/repos?per_page=100`, headers)
  const orgs = await safeJson<GitHubOrg[]>(`${GITHUB_API}/users/${owner}/orgs`, headers)

  const repoCount = repos?.length || profile?.public_repos || 0
  const stars = (repos || []).reduce((sum, r) => sum + (r.stargazers_count || 0), 0)
  const languages = [...new Set((repos || []).map((r) => r.language).filter(Boolean))]

  const packageSignals = detectPackagePublishing(snapshot)
  const readmeLinks = extractLinksFromReadme(snapshot.readmeContent || '')

  const summary = [
    `Client has ${repoCount} repos and ~${stars} total stars`,
    orgs?.length ? `Org memberships: ${orgs.length}` : 'No org memberships found',
    packageSignals.length ? `Publishes packages: ${packageSignals.join(', ')}` : 'No package publishing signals detected',
    snapshot.detectedSiteUrl ? `Product URL detected: ${snapshot.detectedSiteUrl}` : 'No product URL detected'
  ].join('. ')

  return {
    owner,
    repoCount,
    totalStars: stars,
    orgMemberCount: profile?.followers,
    orgCount: orgs?.length || 0,
    languages,
    packageSignals,
    readmeLinks,
    linkedinUrl: readmeLinks.find((l) => l.includes('linkedin.com')),
    summary,
    researchedAt: new Date().toISOString()
  }
}

function detectPackagePublishing(snapshot: RepoSnapshot): string[] {
  const signals: string[] = []
  if (snapshot.fileTree.some((f) => f.endsWith('package.json'))) signals.push('npm')
  if (snapshot.fileTree.some((f) => f.endsWith('Cargo.toml'))) signals.push('crates.io')
  return signals
}

function extractLinksFromReadme(readme: string): string[] {
  const links = readme.match(/https?:\/\/[\w.-]+(?:\/[\w./?%&=+-]*)?/gi) || []
  return [...new Set(links)]
}

async function safeJson<T>(url: string, headers: Record<string, string>): Promise<T | null> {
  try {
    const response = await fetch(url, { headers })
    if (!response.ok) return null
    return response.json<T>()
  } catch {
    return null
  }
}
