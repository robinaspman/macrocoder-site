const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface ReviewRequest {
  type: 'github' | 'website' | 'upwork'
  owner?: string
  repo?: string
  url?: string
  description?: string
  async_mode?: boolean
}

export interface ReviewResult {
  verdict: string
  fixes: string[]
  direction: string
  categories: string[]
  quote?: {
    price: string
    timeline: string
    scope: string[]
  }
  estimate?: {
    price_range: [number, number]
    timeline_weeks: number
    complexity: string
    effort_hours: number
    breakdown: { phase: string; hours: number }[]
    milestones: string[]
    warnings: string[]
  }
}

export interface ReviewStatus {
  id: string
  type: string
  source: string
  status: string
  result?: ReviewResult
  error_message?: string
  created_at?: string
  completed_at?: string
}

export interface ReviewEnqueued {
  id: string
  status: 'pending'
  message: string
}

export async function submitReview(request: ReviewRequest): Promise<ReviewResult | ReviewEnqueued> {
  const response = await fetch(`${API_URL}/api/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error('Review failed')
  }

  return response.json()
}

export async function getReviewStatus(analysisId: string): Promise<ReviewStatus> {
  const response = await fetch(`${API_URL}/api/review/${analysisId}`)
  if (!response.ok) throw new Error('Status check failed')
  return response.json()
}

export async function pollReviewStatus(
  analysisId: string,
  onStatus: (status: ReviewStatus) => void,
  intervalMs = 2000,
  timeoutMs = 120000,
): Promise<ReviewStatus> {
  const start = Date.now()

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getReviewStatus(analysisId)
        onStatus(status)

        if (status.status === 'complete') {
          resolve(status)
          return
        }

        if (status.status === 'failed') {
          reject(new Error(status.error_message || 'Analysis failed'))
          return
        }

        if (Date.now() - start > timeoutMs) {
          reject(new Error('Analysis timed out'))
          return
        }

        setTimeout(poll, intervalMs)
      } catch (err) {
        reject(err)
      }
    }

    poll()
  })
}
