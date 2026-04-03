const API_URL = import.meta.env.VITE_MACROCODER_URL || ''

console.log('[API] VITE_MACROCODER_URL:', API_URL)

// JWT token stored in localStorage after login
function getToken(): string | null {
  return localStorage.getItem('macrocoder_token')
}

function setToken(token: string): void {
  localStorage.setItem('macrocoder_token', token)
}

export function logout(): void {
  localStorage.removeItem('macrocoder_token')
}

export async function login(clientId: string, apiKey: string): Promise<boolean> {
  if (!API_URL) return false
  
  try {
    const formData = new URLSearchParams()
    formData.append('client_id', clientId)
    formData.append('api_key', apiKey)
    
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })
    
    if (!res.ok) return false
    
    const data = await res.json()
    if (data.token) {
      setToken(data.token)
      return true
    }
    return false
  } catch {
    return false
  }
}

async function fetchWithAuth<T>(endpoint: string, fallback: T): Promise<T> {
  if (!API_URL) return fallback
  
  const token = getToken()
  if (!token) return fallback
  
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) return fallback
    return await res.json()
  } catch {
    return fallback
  }
}

async function fetchWithApiKey<T>(endpoint: string, fallback: T): Promise<T> {
  // Legacy - only used if no JWT token available
  const apiKey = import.meta.env.VITE_MACROCODER_API_KEY
  if (!API_URL || !apiKey) return fallback
  
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { 'X-API-Key': apiKey },
    })
    if (!res.ok) return fallback
    return await res.json()
  } catch {
    return fallback
  }
}

async function fetchWithFallback<T>(endpoint: string, fallback: T): Promise<T> {
  // Try JWT first, fall back to API key, then demo
  const tokenResult = await fetchWithAuth(endpoint, fallback)
  if (tokenResult !== fallback) return tokenResult
  
  return fetchWithApiKey(endpoint, fallback)
}

export async function getSessions() {
  return fetchWithFallback('/api/sessions', [])
}

export async function getSessionLines(sessionId: string) {
  return fetchWithApiKey(`/api/sessions/${sessionId}/lines`, [])
}

export async function getActivity() {
  console.log('[API] getActivity called, API_URL:', API_URL)
  if (!API_URL) return []
  
  try {
    const res = await fetch(`${API_URL}/api/activity`)
    console.log('[API] getActivity response:', res.status)
    if (!res.ok) return []
    return await res.json()
  } catch (e) {
    console.log('[API] getActivity error:', e)
    return []
  }
}

export async function getStats() {
  return fetchWithFallback('/api/stats', null)
}

export async function getJournal() {
  return fetchWithFallback('/api/journal', [])
}

export async function getJournalThought(entryId: string) {
  return fetchWithApiKey(`/api/journal/${entryId}/thought`, { expanded_thought: '' })
}

export async function getLatestSnapshots(limit = 6) {
  console.log('[API] getLatestSnapshots called, API_URL:', API_URL)
  if (!API_URL) return { snapshots: [], source: 'demo' }
  
  try {
    const res = await fetch(`${API_URL}/api/snapshots/latest?limit=${limit}`)
    console.log('[API] getLatestSnapshots response:', res.status)
    if (!res.ok) return { snapshots: [], source: 'demo' }
    const data = await res.json()
    console.log('[API] getLatestSnapshots data:', data)
    return data
  } catch (e) {
    console.log('[API] getLatestSnapshots error:', e)
    return { snapshots: [], source: 'demo' }
  }
}

export async function getSnapshot(sessionId: string) {
  if (!API_URL) return null
  
  try {
    const res = await fetch(`${API_URL}/api/snapshots/${sessionId}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function connectTerminalWebSocket(sessionId: string) {
  if (!API_URL) return null
  
  const token = getToken()
  if (!token) return null
  
  const wsUrl = API_URL.replace('http', 'ws') + `/ws/${sessionId}?token=${token}`
  const ws = new WebSocket(wsUrl)
  
  return ws
}

export function isAuthenticated(): boolean {
  return !!getToken()
}