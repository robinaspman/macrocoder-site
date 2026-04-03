const API_URL = import.meta.env.VITE_MACROCODER_URL
const API_KEY = import.meta.env.VITE_MACROCODER_API_KEY

async function fetchWithFallback<T>(endpoint: string, fallback: T): Promise<T> {
  if (!API_URL || !API_KEY) return fallback

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'X-API-Key': API_KEY,
      },
    })
    if (!res.ok) return fallback
    const data = await res.json()
    return data.length === 0 ? fallback : data
  } catch {
    return fallback
  }
}

export async function getSessions() {
  return fetchWithFallback('/api/sessions', [])
}

export async function getSessionLines(sessionId: string) {
  return fetchWithFallback(`/api/sessions/${sessionId}/lines`, [])
}

export async function getActivity() {
  return fetchWithFallback('/api/activity', [])
}

export async function getStats() {
  return fetchWithFallback('/api/stats', null)
}

export async function getJournal() {
  return fetchWithFallback('/api/journal', [])
}

export async function getJournalThought(entryId: string) {
  return fetchWithFallback(`/api/journal/${entryId}/thought`, { expanded_thought: '' })
}

export async function connectTerminalWebSocket(sessionId: string) {
  if (!API_URL || !API_KEY) return null
  
  const wsUrl = API_URL.replace('http', 'ws') + `/ws/${sessionId}`
  const ws = new WebSocket(wsUrl)
  
  return ws
}