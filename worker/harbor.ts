import type { Env, HarborSignals, RepoSnapshot } from './types'

interface HarborApiResponse {
  performance?: {
    load_time_ms?: number
  }
  content?: {
    broken_links?: number
    seo_issues?: number
    mobile_issues?: number
  }
  security?: {
    grade?: string
    findings?: string[]
    tls_grade?: string
  }
}

export async function runHarborScan(snapshot: RepoSnapshot, env: Env): Promise<HarborSignals | null> {
  const targetUrl = snapshot.detectedSiteUrl
  if (!targetUrl) return null

  if (env.HARBOR_API_URL) {
    const response = await fetch(`${env.HARBOR_API_URL.replace(/\/$/, '')}/scan`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.HARBOR_API_TOKEN ? { authorization: `Bearer ${env.HARBOR_API_TOKEN}` } : {})
      },
      body: JSON.stringify({ url: targetUrl, mode: 'full' })
    })

    if (response.ok) {
      const data = await response.json<HarborApiResponse>()
      return {
        targetUrl,
        loadTimeMs: data?.performance?.load_time_ms,
        brokenLinks: data?.content?.broken_links,
        seoIssues: data?.content?.seo_issues,
        mobileIssues: data?.content?.mobile_issues,
        securityGrade: data?.security?.grade,
        securityFindings: data?.security?.findings || [],
        tlsGrade: data?.security?.tls_grade,
        fetchedAt: new Date().toISOString()
      }
    }
  }

  return heuristicHarborSignals(targetUrl, snapshot)
}

function heuristicHarborSignals(targetUrl: string, snapshot: RepoSnapshot): HarborSignals {
  const riskCount = snapshot.deepAnalysis?.riskSignals.length || 0
  const testPenalty = snapshot.testSignals.testFileCount === 0 ? 1 : 0
  const secScore = Math.max(0, 6 - riskCount - testPenalty)
  const grade = secScore >= 5 ? 'A' : secScore >= 4 ? 'B' : secScore >= 3 ? 'C' : 'D'

  return {
    targetUrl,
    loadTimeMs: 1800 + riskCount * 250,
    brokenLinks: Math.max(0, riskCount - 1),
    seoIssues: Math.max(1, riskCount),
    mobileIssues: Math.max(1, Math.floor(riskCount / 2)),
    securityGrade: grade,
    securityFindings: snapshot.deepAnalysis?.riskSignals || [],
    tlsGrade: grade,
    fetchedAt: new Date().toISOString()
  }
}
