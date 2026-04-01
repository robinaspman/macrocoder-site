const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface ReviewRequest {
  type: 'github' | 'website' | 'upwork'
  owner?: string
  repo?: string
  url?: string
  description?: string
}

export interface ReviewResult {
  verdict: string
  fixes: string[]
  direction: string
  quote?: {
    price: string
    timeline: string
    scope: string[]
  }
}

export async function submitReview(request: ReviewRequest): Promise<ReviewResult> {
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

export async function getReviewStatus(sessionId: string): Promise<{ status: string; result?: ReviewResult }> {
  const response = await fetch(`${API_URL}/api/review/${sessionId}`)
  if (!response.ok) throw new Error('Status check failed')
  return response.json()
}
