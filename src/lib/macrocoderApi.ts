const API_URL = import.meta.env.VITE_MACROCODER_URL || ''

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

export async function getLatestSnapshots(limit = 20) {
  if (!API_URL) return { snapshots: [], source: 'demo', grouped: {} }
  
  try {
    const res = await fetch(`${API_URL}/api/snapshots/latest?limit=${limit}`)
    if (!res.ok) return { snapshots: [], source: 'demo', grouped: {} }
    return await res.json()
  } catch {
    return { snapshots: [], source: 'demo', grouped: {} }
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

export async function getRulerSnapshot(): Promise<RulerSnapshot | null> {
  if (!API_URL) return null
  
  try {
    const res = await fetch(`${API_URL}/api/v1/ruler/snapshot`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export interface RulerSnapshot {
  timestamp: string
  healthScore: number
  pieceBreakdown: DetectedPiece[]
  territory: Territory
  concerns: Concern[]
  costs: CostData
  healthHistory: HealthPoint[]
  providerMetrics: ProviderMetric[]
  providerLatencyHistory: LatencyPoint[]
  strategyStats: StrategyResult[]
  recentMoves: RecentMove[]
  archetypeProfile: ArchetypeWeight[]
  dominantArchetype: string
  archetypeWellness: number
  archetypePredictions: ArchetypePrediction[]
  recentTransitions: ArchetypeTransition[]
  activeThreats: ThreatEntry[]
  threatSeverityCounts: Record<string, number>
  threatKindCounts: ThreatKindCount[]
  goTerritory: GoTerritory
  territoryBoard: number[][]
  openingBook: Opening[]
  recentRulings: RulingEntry[]
}

interface DetectedPiece {
  piece: string
  count: number
  percentage: number
  color: string
}

interface Territory {
  dominant: string
  concurrent: number
  async: number
  errorHandling: number
  unsafeCode: number
  reflection: number
}

interface Concern {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  description: string
  piece: string
  location: string
}

interface CostData {
  dailyCosts: DailyCost[]
  costPerTask: CostPerTask[]
  budget: Budget
  providerCosts: ProviderCost[]
  dailyCostsMax: number
}

interface DailyCost {
  date: string
  claude: number
  openrouter: number
  ollama: number
}

interface CostPerTask {
  task: string
  avgCost: number
  count: number
}

interface Budget {
  total: number
  spent: number
  cacheSavings: number
  cacheHitRate: number
  requestsAvoided: number
}

interface ProviderCost {
  provider: string
  cost: number
  percentage: number
  color: string
}

interface HealthPoint {
  session: string
  score: number
  piecesResolved: number
  concernsClosed: number
}

interface ProviderMetric {
  provider: string
  avgLatency: number
  successRate: number
  throttleCount: number
  fallbackCount: number
  color: string
}

interface LatencyPoint {
  time: string
  claude: number
  gpt4o: number
  mini: number
  ollama: number
}

interface StrategyResult {
  strategy: string
  totalAttempts: number
  successRate: number
  avgHealthImprovement: number
  bestForPiece: string
  color: string
}

interface RecentMove {
  timestamp: string
  strategy: string
  piece: string
  success: boolean
  healthBefore: number
  healthAfter: number
  latencyMs: number
  provider: string
}

interface ArchetypeWeight {
  archetype: string
  weight: number
  subtype: string
  phase: string
  color: string
  icon: string
  desire: string
  provider: string
  providerReason: string
}

interface ArchetypePrediction {
  id: string
  type: string
  icon: string
  probability: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  evidence: string
  prevention: string
}

interface ArchetypeTransition {
  from: string
  to: string
  trigger: string
  timestamp: string
  section: string
}

interface ThreatEntry {
  kind: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none'
  location: string
  description: string
  piece: string
}

interface ThreatKindCount {
  kind: string
  count: number
  color: string
}

interface GoTerritory {
  blackControl: number
  whiteControl: number
  contested: number
  neutral: number
  totalLiberties: number
  capturesBlack: number
  capturesWhite: number
  koHash: string
}

interface Opening {
  name: string
  projectType: string
  difficulty: string
  estimatedTimeMs: number
  keyPieces: string[]
  moveCount: number
  description: string
}

interface RulingEntry {
  category: string
  pattern: string
  priority: 'critical' | 'high' | 'medium' | 'low' | 'info'
  transformation: string
  location: string
  autoSafe: boolean
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