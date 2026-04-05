// ── Tier 1: Codebase X-Ray ──────────────────────────────────────────

export interface DetectedPiece {
  piece: string
  count: number
  percentage: number
  color: string
}

export const PIECE_BREAKDOWN: DetectedPiece[] = [
  { piece: 'AsyncPipeline', count: 47, percentage: 28, color: '#22d3ee' },
  { piece: 'ErrorAlgebra', count: 38, percentage: 23, color: '#c45a3a' },
  { piece: 'GoroutineCoord', count: 22, percentage: 13, color: '#1fc164' },
  { piece: 'OwnershipOracle', count: 18, percentage: 11, color: '#e0a040' },
  { piece: 'ResourceGuard', count: 14, percentage: 8, color: '#a78bfa' },
  { piece: 'PointerMaster', count: 11, percentage: 7, color: '#f472b6' },
  { piece: 'ClosureHandler', count: 9, percentage: 5, color: '#facc15' },
  { piece: 'Other', count: 8, percentage: 5, color: '#5a7a7a' },
]

export const HEALTH_SCORE = 67

export interface Concern {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  description: string
  piece: string
  location: string
}

export const TOP_CONCERNS: Concern[] = [
  { severity: 'critical', description: 'Unbounded channel in hot path — backpressure missing', piece: 'AsyncPipeline', location: 'src/pipeline/ingest.rs:142' },
  { severity: 'high', description: 'Raw pointer dereference without null check', piece: 'PointerMaster', location: 'src/ffi/bridge.rs:88' },
  { severity: 'high', description: '.unwrap() on user-facing Result', piece: 'ErrorAlgebra', location: 'src/api/handler.rs:56' },
  { severity: 'medium', description: 'Arc<Mutex<T>> contention — consider RwLock', piece: 'OwnershipOracle', location: 'src/cache/store.rs:34' },
  { severity: 'low', description: 'Scope guard missing before .await', piece: 'ResourceGuard', location: 'src/worker/task.rs:201' },
]

export const QUICK_FIXES_AVAILABLE = 23

export const TERRITORY = {
  dominant: 'Concurrency-Dominant',
  concurrent: 42,
  async: 38,
  errorHandling: 28,
  unsafeCode: 11,
  reflection: 4,
}

export const ESTIMATED_COMPLEXITY = 'Advanced'
export const RECOMMENDED_OPENING = 'Web Service Master'

// ── Tier 1: Cost Tracker ────────────────────────────────────────────

export interface DailyCost {
  date: string
  claude: number
  openrouter: number
  ollama: number
}

export const DAILY_COSTS: DailyCost[] = [
  { date: 'Mar 28', claude: 1.24, openrouter: 0.42, ollama: 0.0 },
  { date: 'Mar 29', claude: 2.18, openrouter: 0.68, ollama: 0.0 },
  { date: 'Mar 30', claude: 1.87, openrouter: 0.55, ollama: 0.0 },
  { date: 'Mar 31', claude: 3.02, openrouter: 0.91, ollama: 0.0 },
  { date: 'Apr 01', claude: 2.45, openrouter: 0.73, ollama: 0.0 },
  { date: 'Apr 02', claude: 1.98, openrouter: 0.62, ollama: 0.0 },
  { date: 'Apr 03', claude: 2.76, openrouter: 0.84, ollama: 0.0 },
]

export const COST_PER_TASK = [
  { task: 'ErrorAlgebra fixes', avgCost: 0.003, count: 142 },
  { task: 'AsyncPipeline rewrites', avgCost: 0.012, count: 47 },
  { task: 'OwnershipOracle analysis', avgCost: 0.008, count: 63 },
  { task: 'PointerMaster wrapping', avgCost: 0.005, count: 38 },
  { task: 'ResourceGuard insertion', avgCost: 0.004, count: 29 },
  { task: 'Detection (simple)', avgCost: 0.001, count: 412 },
]

export const BUDGET = {
  total: 50.0,
  spent: 19.25,
  cacheSavings: 8.42,
  cacheHitRate: 34,
  requestsAvoided: 1847,
}

export const PROVIDER_COSTS = [
  { provider: 'claude-sonnet', cost: 14.50, percentage: 75, color: '#e0a040' },
  { provider: 'gpt-4o', cost: 3.20, percentage: 17, color: '#22d3ee' },
  { provider: 'gpt-4o-mini', cost: 1.15, percentage: 6, color: '#1fc164' },
  { provider: 'ollama-codellama', cost: 0.40, percentage: 2, color: '#a78bfa' },
]

// ── Tier 1: Project Health Over Time ────────────────────────────────

export interface HealthPoint {
  session: string
  score: number
  piecesResolved: number
  concernsClosed: number
}

export const HEALTH_HISTORY: HealthPoint[] = [
  { session: 'Session 1', score: 34, piecesResolved: 0, concernsClosed: 0 },
  { session: 'Session 2', score: 41, piecesResolved: 8, concernsClosed: 3 },
  { session: 'Session 3', score: 45, piecesResolved: 14, concernsClosed: 7 },
  { session: 'Session 4', score: 52, piecesResolved: 22, concernsClosed: 11 },
  { session: 'Session 5', score: 58, piecesResolved: 31, concernsClosed: 16 },
  { session: 'Session 6', score: 62, piecesResolved: 38, concernsClosed: 19 },
  { session: 'Session 7', score: 67, piecesResolved: 45, concernsClosed: 24 },
]

export const QUICK_FIXES_APPLIED = 67
export const PIECES_REMAINING = 42

// ── Tier 2: Provider Performance ────────────────────────────────────

export interface ProviderMetric {
  provider: string
  avgLatency: number
  successRate: number
  throttleCount: number
  fallbackCount: number
  color: string
}

export const PROVIDER_METRICS: ProviderMetric[] = [
  { provider: 'claude-sonnet', avgLatency: 2400, successRate: 96.2, throttleCount: 3, fallbackCount: 0, color: '#e0a040' },
  { provider: 'gpt-4o', avgLatency: 1800, successRate: 93.8, throttleCount: 7, fallbackCount: 2, color: '#22d3ee' },
  { provider: 'gpt-4o-mini', avgLatency: 680, successRate: 91.4, throttleCount: 1, fallbackCount: 0, color: '#1fc164' },
  { provider: 'ollama-codellama', avgLatency: 320, successRate: 82.1, throttleCount: 0, fallbackCount: 0, color: '#a78bfa' },
]

export const PROVIDER_LATENCY_HISTORY = [
  { time: '08:00', claude: 2200, gpt4o: 1600, mini: 620, ollama: 300 },
  { time: '09:00', claude: 2500, gpt4o: 1900, mini: 700, ollama: 310 },
  { time: '10:00', claude: 2800, gpt4o: 2100, mini: 750, ollama: 340 },
  { time: '11:00', claude: 2400, gpt4o: 1800, mini: 680, ollama: 320 },
  { time: '12:00', claude: 2300, gpt4o: 1700, mini: 660, ollama: 310 },
  { time: '13:00', claude: 2600, gpt4o: 2000, mini: 720, ollama: 330 },
  { time: '14:00', claude: 2100, gpt4o: 1500, mini: 640, ollama: 290 },
  { time: '15:00', claude: 2400, gpt4o: 1800, mini: 680, ollama: 320 },
]

// ── Tier 2: Strategy Effectiveness ──────────────────────────────────

export interface StrategyResult {
  strategy: string
  totalAttempts: number
  successRate: number
  avgHealthImprovement: number
  bestForPiece: string
  color: string
}

export const STRATEGY_STATS: StrategyResult[] = [
  { strategy: 'Castling', totalAttempts: 84, successRate: 92, avgHealthImprovement: 4.2, bestForPiece: 'PointerMaster', color: '#1fc164' },
  { strategy: 'QueensGambit', totalAttempts: 67, successRate: 88, avgHealthImprovement: 5.1, bestForPiece: 'AsyncPipeline', color: '#e0a040' },
  { strategy: 'RuyLopez', totalAttempts: 53, successRate: 85, avgHealthImprovement: 3.8, bestForPiece: 'ErrorAlgebra', color: '#22d3ee' },
  { strategy: 'SicilianDefense', totalAttempts: 41, successRate: 60, avgHealthImprovement: 2.1, bestForPiece: 'AsyncPipeline', color: '#c45a3a' },
  { strategy: 'IndianDefense', totalAttempts: 38, successRate: 79, avgHealthImprovement: 3.5, bestForPiece: 'OwnershipOracle', color: '#a78bfa' },
  { strategy: 'FrenchDefense', totalAttempts: 29, successRate: 83, avgHealthImprovement: 2.9, bestForPiece: 'ResourceGuard', color: '#facc15' },
  { strategy: 'KingsGambit', totalAttempts: 22, successRate: 73, avgHealthImprovement: 6.4, bestForPiece: 'GoroutineCoord', color: '#f472b6' },
  { strategy: 'EnPassant', totalAttempts: 18, successRate: 78, avgHealthImprovement: 3.2, bestForPiece: 'PointerMaster', color: '#fb923c' },
]

export interface RecentMove {
  timestamp: string
  strategy: string
  piece: string
  success: boolean
  healthBefore: number
  healthAfter: number
  latencyMs: number
  provider: string
}

export const RECENT_MOVES: RecentMove[] = [
  { timestamp: '09:42:18', strategy: 'Castling', piece: 'PointerMaster', success: true, healthBefore: 64, healthAfter: 68, latencyMs: 2340, provider: 'claude-sonnet' },
  { timestamp: '09:38:02', strategy: 'QueensGambit', piece: 'AsyncPipeline', success: true, healthBefore: 61, healthAfter: 67, latencyMs: 3100, provider: 'claude-sonnet' },
  { timestamp: '09:31:45', strategy: 'SicilianDefense', piece: 'AsyncPipeline', success: false, healthBefore: 61, healthAfter: 61, latencyMs: 2800, provider: 'gpt-4o' },
  { timestamp: '09:22:10', strategy: 'RuyLopez', piece: 'ErrorAlgebra', success: true, healthBefore: 58, healthAfter: 62, latencyMs: 1950, provider: 'claude-sonnet' },
  { timestamp: '09:15:33', strategy: 'IndianDefense', piece: 'OwnershipOracle', success: true, healthBefore: 55, healthAfter: 59, latencyMs: 2100, provider: 'gpt-4o' },
  { timestamp: '09:08:57', strategy: 'FrenchDefense', piece: 'ResourceGuard', success: true, healthBefore: 52, healthAfter: 56, latencyMs: 1400, provider: 'gpt-4o-mini' },
  { timestamp: '08:55:41', strategy: 'KingsGambit', piece: 'GoroutineCoord', success: true, healthBefore: 48, healthAfter: 54, latencyMs: 3400, provider: 'claude-sonnet' },
  { timestamp: '08:42:19', strategy: 'Castling', piece: 'PointerMaster', success: true, healthBefore: 45, healthAfter: 49, latencyMs: 2200, provider: 'claude-sonnet' },
]

// ── Archetypes ──────────────────────────────────────────────────────

export interface ArchetypeWeight {
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

export const ARCHETYPE_PROFILE: ArchetypeWeight[] = [
  { archetype: 'Alpha', weight: 0.32, subtype: 'Effective', phase: 'Commanding', color: '#c45a3a', icon: '\u2694\uFE0F', desire: 'Dominance through aggressive throughput', provider: 'claude-sonnet', providerReason: 'Complex multi-pattern rewrites need max reasoning' },
  { archetype: 'YangSigma', weight: 0.24, subtype: 'Projecting', phase: 'Projecting', color: '#e0a040', icon: '\u2728', desire: 'Build alone, create outward', provider: 'claude-sonnet', providerReason: 'Structural creation requires deep understanding' },
  { archetype: 'Bravo', weight: 0.18, subtype: 'Expanding', phase: 'Accelerating', color: '#1fc164', icon: '\uD83D\uDE80', desire: 'Linear growth expansion', provider: 'gpt-4o', providerReason: 'Balanced speed/quality for feature scaling' },
  { archetype: 'Delta', weight: 0.12, subtype: 'Stable', phase: 'Steady', color: '#22d3ee', icon: '\uD83D\uDEE1\uFE0F', desire: 'Steady-state reliability', provider: 'gpt-4o-mini', providerReason: 'Maintenance tasks are predictable, favor speed' },
  { archetype: 'Gamma', weight: 0.08, subtype: 'Oscillating', phase: 'Surging', color: '#a78bfa', icon: '\u26A1', desire: 'Rapid burst oscillation', provider: 'gpt-4o', providerReason: 'Burst work needs fast iteration with decent quality' },
  { archetype: 'Omega', weight: 0.04, subtype: 'Purifying', phase: 'Shedding', color: '#5a7a7a', icon: '\uD83C\uDF19', desire: 'Controlled decline & purification', provider: 'ollama-codellama', providerReason: 'Cleanup/deletion tasks are simple, use local' },
  { archetype: 'YinSigma', weight: 0.02, subtype: 'Absorbing', phase: 'Gathering', color: '#f472b6', icon: '\uD83C\uDF0A', desire: 'Absorb and follow flow', provider: 'gpt-4o-mini', providerReason: 'Analysis/detection is lightweight' },
]

export const DOMINANT_ARCHETYPE = 'Alpha'
export const ARCHETYPE_WELLNESS = 78

export interface ArchetypePrediction {
  id: string
  type: string
  icon: string
  probability: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  evidence: string
  prevention: string
}

export const ARCHETYPE_PREDICTIONS: ArchetypePrediction[] = [
  { id: 'p1', type: 'AlphaAlphaCollision', icon: '\u2694\uFE0F', probability: 72, severity: 'high', description: 'Two Alpha sections competing for the same resource pool', evidence: 'pipeline/ingest.rs and api/handler.rs both aggressively acquire connections', prevention: 'Introduce Delta mediator section with connection pooling' },
  { id: 'p2', type: 'SuperBravoUncheckedGrowth', icon: '\uD83D\uDCC8\uD83D\uDCA5', probability: 58, severity: 'medium', description: 'Feature growth outpacing architecture capacity', evidence: 'Worker module added 14 new handlers in 3 sessions without refactoring', prevention: 'Pause feature additions, apply YangSigma structural pass' },
  { id: 'p3', type: 'BravoSpaghettiCoupling', icon: '\uD83C\uDF5D', probability: 45, severity: 'medium', description: 'Cross-module coupling growing through Bravo expansion', evidence: '8 modules now import from cache/store.rs directly', prevention: 'Extract trait interface, apply IndianDefense strategy' },
  { id: 'p4', type: 'WanderingSpread', icon: '\uD83D\uDC7B', probability: 31, severity: 'low', description: 'Dead code confusion spreading from deprecated modules', evidence: '3 unused utility functions still referenced in docs', prevention: 'Apply Omega purification pass on src/legacy/' },
  { id: 'p5', type: 'UnstableGammaCollapse', icon: '\uD83C\uDF0A\uD83D\uDCA5', probability: 22, severity: 'low', description: 'Oscillation between two competing async patterns', evidence: 'tokio::spawn and async-std mixed in worker module', prevention: 'Standardize on single async runtime (Castling strategy)' },
]

export interface ArchetypeTransition {
  from: string
  to: string
  trigger: string
  timestamp: string
  section: string
}

export const RECENT_TRANSITIONS: ArchetypeTransition[] = [
  { from: 'Bravo', to: 'Alpha', trigger: 'Performance hotpath identified', timestamp: '09:41', section: 'pipeline/ingest.rs' },
  { from: 'Gamma', to: 'Delta', trigger: 'Oscillation stabilized after fix', timestamp: '09:28', section: 'worker/scheduler.rs' },
  { from: 'Alpha', to: 'YangSigma', trigger: 'Throughput goal met, restructuring', timestamp: '09:14', section: 'api/handler.rs' },
  { from: 'Delta', to: 'Omega', trigger: 'Module marked for deprecation', timestamp: '08:52', section: 'legacy/v1_compat.rs' },
  { from: 'YinSigma', to: 'Bravo', trigger: 'New feature branch started', timestamp: '08:40', section: 'cache/store.rs' },
]

// ── Threats & Board ─────────────────────────────────────────────────

export interface ThreatEntry {
  kind: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none'
  location: string
  description: string
  piece: string
}

export const ACTIVE_THREATS: ThreatEntry[] = [
  { kind: 'DataRace', severity: 'critical', location: 'src/cache/store.rs:67', description: 'Concurrent HashMap access without lock', piece: 'OwnershipOracle' },
  { kind: 'BlockingInAsync', severity: 'high', location: 'src/worker/task.rs:134', description: 'std::fs::read in async context blocks executor', piece: 'AsyncPipeline' },
  { kind: 'MemoryLeak', severity: 'high', location: 'src/ffi/bridge.rs:92', description: 'Box::into_raw without matching deallocation', piece: 'PointerMaster' },
  { kind: 'GoroutineLeak', severity: 'medium', location: 'src/pipeline/fanout.rs:45', description: 'Spawned task without cancellation token', piece: 'GoroutineCoord' },
  { kind: 'MissingErrorHandling', severity: 'medium', location: 'src/api/middleware.rs:23', description: 'Panic on invalid header instead of 400', piece: 'ErrorAlgebra' },
  { kind: 'ResourceLeak', severity: 'medium', location: 'src/db/pool.rs:78', description: 'Connection not returned on early return path', piece: 'ResourceGuard' },
  { kind: 'UnnecessaryAllocation', severity: 'low', location: 'src/util/format.rs:12', description: 'String allocation in hot loop — use &str', piece: 'LayoutArchitect' },
  { kind: 'BorrowViolation', severity: 'low', location: 'src/transform/apply.rs:89', description: 'Mutable borrow shadowed by immutable ref', piece: 'OwnershipOracle' },
]

export const THREAT_SEVERITY_COUNTS = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 2,
  none: 56,
}

export const THREAT_KIND_COUNTS = [
  { kind: 'MissingErrorHandling', count: 8, color: '#c45a3a' },
  { kind: 'UnnecessaryAllocation', count: 6, color: '#e0a040' },
  { kind: 'BlockingInAsync', count: 4, color: '#22d3ee' },
  { kind: 'BorrowViolation', count: 3, color: '#a78bfa' },
  { kind: 'ResourceLeak', count: 3, color: '#facc15' },
  { kind: 'DataRace', count: 2, color: '#f472b6' },
  { kind: 'MemoryLeak', count: 2, color: '#1fc164' },
  { kind: 'GoroutineLeak', count: 1, color: '#fb923c' },
]

// ── Go Territory Mechanics ──────────────────────────────────────────

export const GO_TERRITORY = {
  blackControl: 38,  // % of board controlled by "safe" code
  whiteControl: 24,  // % controlled by "unsafe/risky" code
  contested: 22,     // % contested (needs review)
  neutral: 16,       // % unanalyzed
  totalLiberties: 142,
  capturesBlack: 14,  // dead code removed (good)
  capturesWhite: 3,   // regressions introduced
  koHash: 'a7f3e2d1', // current board state hash
}

export const TERRITORY_BOARD = [
  // 8x8 grid: 0=neutral, 1=black(safe), 2=white(risky), 3=contested
  [1, 1, 1, 3, 2, 1, 1, 1],
  [1, 1, 3, 3, 2, 2, 1, 1],
  [1, 3, 1, 1, 3, 2, 1, 1],
  [3, 3, 1, 1, 1, 3, 3, 0],
  [0, 1, 1, 1, 1, 1, 3, 2],
  [1, 1, 1, 3, 1, 1, 2, 2],
  [1, 1, 1, 1, 3, 1, 1, 1],
  [1, 1, 0, 1, 1, 1, 1, 1],
]

// ── Opening Book ────────────────────────────────────────────────────

export interface Opening {
  name: string
  projectType: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  estimatedTimeMs: number
  keyPieces: string[]
  moveCount: number
  description: string
}

export const OPENING_BOOK: Opening[] = [
  { name: 'CLI Champion', projectType: 'CLI', difficulty: 'Beginner', estimatedTimeMs: 45000, keyPieces: ['ErrorAlgebra', 'ResourceGuard'], moveCount: 4, description: 'Clap command structure with derives, tokio runtime, error handling' },
  { name: 'Web Service Master', projectType: 'WebService', difficulty: 'Intermediate', estimatedTimeMs: 120000, keyPieces: ['AsyncPipeline', 'ErrorAlgebra', 'ResourceGuard', 'OwnershipOracle'], moveCount: 6, description: 'Axum routes, state management, graceful shutdown' },
  { name: 'Embedded Warrior', projectType: 'Embedded', difficulty: 'Expert', estimatedTimeMs: 90000, keyPieces: ['PointerMaster', 'LayoutArchitect', 'ResourceGuard'], moveCount: 5, description: 'no_std environment, hardware abstractions, interrupt handlers' },
  { name: 'Library Builder', projectType: 'Library', difficulty: 'Intermediate', estimatedTimeMs: 60000, keyPieces: ['ErrorAlgebra', 'ClosureHandler'], moveCount: 4, description: 'Public API design, trait definitions, documentation' },
  { name: 'Game Developer', projectType: 'Game', difficulty: 'Advanced', estimatedTimeMs: 150000, keyPieces: ['AsyncPipeline', 'LayoutArchitect', 'GoroutineCoord'], moveCount: 7, description: 'Bevy game loop, ECS components, delta time, render pipeline' },
]

// ── Rulings & Transformations ───────────────────────────────────────

export interface RulingEntry {
  category: string
  pattern: string
  priority: 'critical' | 'high' | 'medium' | 'low' | 'info'
  transformation: string
  location: string
  autoSafe: boolean
}

export const RECENT_RULINGS: RulingEntry[] = [
  { category: 'ErrorHandling', pattern: 'Exception', priority: 'high', transformation: 'AddErrorHandling', location: 'src/api/handler.rs:56', autoSafe: true },
  { category: 'Concurrency', pattern: 'Async', priority: 'critical', transformation: 'RefactorAsync', location: 'src/pipeline/ingest.rs:142', autoSafe: false },
  { category: 'Performance', pattern: 'Allocation', priority: 'medium', transformation: 'ToggleClone', location: 'src/util/format.rs:12', autoSafe: true },
  { category: 'BorrowChecker', pattern: 'Borrow', priority: 'low', transformation: 'BorrowToRef', location: 'src/transform/apply.rs:89', autoSafe: true },
  { category: 'ResourceManagement', pattern: 'OwnershipTransfer', priority: 'medium', transformation: 'WrapShared', location: 'src/cache/store.rs:34', autoSafe: false },
  { category: 'Allocation', pattern: 'Clone', priority: 'low', transformation: 'ChangeOwnership', location: 'src/db/model.rs:67', autoSafe: true },
]
