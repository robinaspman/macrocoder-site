export const STAT_CARDS = [
  { label: 'TOTAL REQUESTS', value: '2.4M', change: '+12.3%', up: true },
  { label: 'AVG LATENCY', value: '14ms', change: '-8.1%', up: false },
  { label: 'ERROR RATE', value: '0.03%', change: '-42%', up: false },
  { label: 'UPTIME', value: '99.99%', change: '+0.01%', up: true },
  { label: 'ACTIVE USERS', value: '18.7K', change: '+23.5%', up: true },
  { label: 'DEPLOYMENTS', value: '147', change: '+18', up: true },
]

export const REQUEST_VOLUME = [
  { hour: '00:00', requests: 72000, errors: 200 },
  { hour: '01:00', requests: 85000, errors: 180 },
  { hour: '02:00', requests: 120000, errors: 350 },
  { hour: '03:00', requests: 115000, errors: 300 },
  { hour: '04:00', requests: 95000, errors: 250 },
  { hour: '05:00', requests: 80000, errors: 220 },
  { hour: '06:00', requests: 75000, errors: 190 },
  { hour: '07:00', requests: 90000, errors: 280 },
  { hour: '08:00', requests: 70000, errors: 210 },
  { hour: '09:00', requests: 65000, errors: 180 },
  { hour: '10:00', requests: 60000, errors: 160 },
  { hour: '11:00', requests: 55000, errors: 150 },
  { hour: '12:00', requests: 68000, errors: 200 },
  { hour: '13:00', requests: 72000, errors: 220 },
  { hour: '14:00', requests: 65000, errors: 190 },
  { hour: '15:00', requests: 58000, errors: 170 },
  { hour: '16:00', requests: 75000, errors: 230 },
  { hour: '17:00', requests: 82000, errors: 260 },
  { hour: '18:00', requests: 90000, errors: 290 },
  { hour: '19:00', requests: 105000, errors: 320 },
  { hour: '20:00', requests: 98000, errors: 310 },
  { hour: '21:00', requests: 110000, errors: 340 },
  { hour: '22:00', requests: 120000, errors: 360 },
  { hour: '23:00', requests: 130000, errors: 400 },
]

export const TRAFFIC_SOURCES = [
  { source: 'Direct', count: 9200, color: '#e0a040' },
  { source: 'API', count: 7800, color: '#22d3ee' },
  { source: 'Webhook', count: 5400, color: '#a78bfa' },
  { source: 'OAuth', count: 4200, color: '#1fc164' },
  { source: 'CLI', count: 2800, color: '#facc15' },
]

export const EDGE_REGIONS = [
  { region: 'us-east-1', requests: '890k', latency: '8ms', status: 'healthy' },
  { region: 'eu-west-1', requests: '620k', latency: '12ms', status: 'healthy' },
  { region: 'ap-southeast-1', requests: '410k', latency: '18ms', status: 'healthy' },
  { region: 'us-west-2', requests: '340k', latency: '10ms', status: 'healthy' },
  { region: 'eu-central-1', requests: '180k', latency: '14ms', status: 'warning' },
]

export const LATENCY_DATA = [
  { hour: '00:00', p50: 12 },
  { hour: '01:00', p50: 14 },
  { hour: '02:00', p50: 16 },
  { hour: '03:00', p50: 18 },
  { hour: '04:00', p50: 17 },
  { hour: '05:00', p50: 19 },
  { hour: '06:00', p50: 20 },
  { hour: '07:00', p50: 18 },
  { hour: '08:00', p50: 16 },
  { hour: '09:00', p50: 15 },
  { hour: '10:00', p50: 17 },
  { hour: '11:00', p50: 18 },
  { hour: '12:00', p50: 16 },
  { hour: '13:00', p50: 14 },
  { hour: '14:00', p50: 12 },
  { hour: '15:00', p50: 10 },
  { hour: '16:00', p50: 9 },
  { hour: '17:00', p50: 8 },
  { hour: '18:00', p50: 7 },
  { hour: '19:00', p50: 6 },
  { hour: '20:00', p50: 5 },
  { hour: '21:00', p50: 6 },
  { hour: '22:00', p50: 7 },
  { hour: '23:00', p50: 8 },
]

export const ENDPOINTS = [
  { method: 'GET', path: '/api/v2/users', requests: 482000, avg: '8ms', p99: '24ms', errorRate: '0.01%' },
  { method: 'POST', path: '/api/v2/auth/token', requests: 318000, avg: '12ms', p99: '45ms', errorRate: '0.02%' },
  { method: 'GET', path: '/api/v2/projects', requests: 256000, avg: '15ms', p99: '52ms', errorRate: '0.01%' },
  { method: 'POST', path: '/api/v2/deploy', requests: 14700, avg: '2400ms', p99: '8500ms', errorRate: '0.15%' },
  { method: 'GET', path: '/api/v2/logs', requests: 198000, avg: '22ms', p99: '78ms', errorRate: '0.03%' },
  { method: 'POST', path: '/api/v2/webhooks', requests: 87000, avg: '18ms', p99: '62ms', errorRate: '0.05%' },
  { method: 'PUT', path: '/api/v2/storage/upload', requests: 42000, avg: '340ms', p99: '1200ms', errorRate: '0.08%' },
  { method: 'GET', path: '/api/v2/billing', requests: 156000, avg: '11ms', p99: '30ms', errorRate: '0.00%' },
]

export const DEPLOYMENTS = [
  { message: 'feat: add analytics dashboard', branch: 'main', agent: 'agent-alpha', duration: '1m 34s', status: 'success' as const, time: '2026-04-04 09:42:18' },
  { message: 'fix: OAuth callback redirect loop', branch: 'fix/auth-redirect', agent: 'agent-beta', duration: '0m 58s', status: 'success' as const, time: '2026-04-04 09:38:02' },
  { message: 'chore: migrate to edge functions v2', branch: 'main', agent: 'agent-gamma', duration: '—', status: 'building' as const, time: '2026-04-04 09:31:45' },
  { message: 'feat: Redis-backed rate limiter', branch: 'feat/rate-limiter', agent: 'agent-alpha', duration: '2m 12s', status: 'success' as const, time: '2026-04-04 09:22:10' },
  { message: 'fix: connection pool exhaustion', branch: 'hotfix/db-pool', agent: 'agent-beta', duration: '0m 22s', status: 'failed' as const, time: '2026-04-04 09:15:33' },
  { message: 'refactor: split monolith into microservices', branch: 'main', agent: 'agent-gamma', duration: '1m 47s', status: 'success' as const, time: '2026-04-04 09:08:57' },
  { message: 'feat: CDN edge caching layer', branch: 'feat/caching', agent: 'agent-alpha', duration: '1m 05s', status: 'success' as const, time: '2026-04-04 08:55:41' },
  { message: 'perf: optimize SQL query plans', branch: 'main', agent: 'agent-beta', duration: '1m 28s', status: 'success' as const, time: '2026-04-04 08:42:19' },
]
