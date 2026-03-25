import type { AuditReport, DeepAnalysis, LeadSummary, RepoSnapshot } from './types'

export interface QuickAnalysis {
  stackLabel: string
  testCoverageSignal: string
  ciSignal: string
  qualitySignals: string[]
}

export function runQuickAnalysis(snapshot: RepoSnapshot): QuickAnalysis {
  const frameworks = snapshot.stack.frameworks.join(' + ') || 'unknown stack'
  const stackLabel = `${frameworks}${snapshot.stack.languages.length ? ` (${snapshot.stack.languages.join(', ')})` : ''}`
  const testCoverageSignal = snapshot.testSignals.testFileCount > 0
    ? `${snapshot.testSignals.testFileCount} test files detected`
    : 'No test files found'
  const ciSignal = snapshot.ciSignals.workflowFiles.length > 0
    ? `${snapshot.ciSignals.workflowFiles.length} CI workflow files`
    : 'No CI workflow files detected'

  const qualitySignals: string[] = []
  if (!snapshot.fileTree.some((f) => f.includes('.eslintrc') || f === 'eslint.config.js')) qualitySignals.push('Missing ESLint config')
  if (!snapshot.fileTree.some((f) => f.toLowerCase().includes('prettier'))) qualitySignals.push('No Prettier config detected')
  if (!snapshot.fileTree.some((f) => f.includes('tsconfig'))) qualitySignals.push('TypeScript strictness unknown')

  return { stackLabel, testCoverageSignal, ciSignal, qualitySignals }
}

export function runDeepAnalysis(snapshot: RepoSnapshot): DeepAnalysis {
  const architectureSignals: string[] = []
  const deploymentSignals: string[] = []
  const qualitySignals: string[] = []
  const riskSignals: string[] = []

  if (snapshot.fileTree.some((f) => f.includes('/api/') || f.startsWith('api/'))) architectureSignals.push('API route layer detected')
  if (snapshot.fileTree.some((f) => f.includes('prisma/schema.prisma'))) architectureSignals.push('Prisma schema present; DB-backed app likely')
  if (snapshot.fileTree.some((f) => f.endsWith('Dockerfile'))) deploymentSignals.push('Docker deployment artifacts found')
  if (snapshot.fileTree.some((f) => f.includes('vercel.json'))) deploymentSignals.push('Vercel deployment configuration found')
  if (snapshot.fileTree.some((f) => f.includes('.github/workflows'))) deploymentSignals.push('GitHub Actions CI/CD present')

  if (snapshot.testSignals.testFileCount === 0) riskSignals.push('No automated tests found')
  if (snapshot.ciSignals.workflowFiles.length === 0) riskSignals.push('No CI workflows found')
  if (snapshot.dependencySummary.outdatedHints.length > 0) riskSignals.push(...snapshot.dependencySummary.outdatedHints)

  if (snapshot.fileTree.some((f) => f.includes('eslint'))) qualitySignals.push('Linting configuration found')
  if (snapshot.fileTree.some((f) => f.includes('prettier'))) qualitySignals.push('Formatting configuration found')

  return {
    architectureSignals,
    deploymentSignals,
    qualitySignals,
    riskSignals,
    completedAt: new Date().toISOString()
  }
}

export function synthesizeLeadSummary(input: {
  clientName: string
  snapshot: RepoSnapshot
  transcript: string
  budgetEstimate: { hours: number; estimate: string; rateBand: string }
}): LeadSummary {
  const { clientName, snapshot, transcript, budgetEstimate } = input
  const explicitBudget = transcript.match(/\$\s?\d[\d,]*(?:\s?-\s?\$?\d[\d,]*)?/)?.[0] || 'not provided'

  return {
    client_name: clientName,
    stack: [...snapshot.stack.frameworks, ...snapshot.stack.languages],
    scope_summary: deriveScopeSummary(transcript),
    budget_stated: explicitBudget,
    budget_estimated: budgetEstimate.estimate,
    effort_hours: budgetEstimate.hours,
    urgency: /asap|urgent|this week/i.test(transcript) ? 'high' : 'medium',
    client_signals: inferClientSignals(transcript),
    recommended_rate: budgetEstimate.rateBand,
    recommended_approach: explicitBudget === 'not provided'
      ? 'Present two pricing options with discovery milestone first'
      : 'Propose phased delivery with clear milestone boundaries',
    key_findings: buildFindings(snapshot)
  }
}

function deriveScopeSummary(transcript: string): string {
  const lines = transcript.split('\n').filter(Boolean)
  const condensed = lines.slice(-4).join(' ').slice(0, 180)
  return condensed || 'Scope discussed during chat; awaiting explicit final requirements.'
}

function inferClientSignals(transcript: string): string[] {
  const signals: string[] = []
  if (/cto|engineer|architecture|api/i.test(transcript)) signals.push('technical_buyer')
  if (/budget|cost|cheaper|discount/i.test(transcript)) signals.push('value_sensitive')
  if (/deadline|urgent|launch/i.test(transcript)) signals.push('time_sensitive')
  return signals.length ? signals : ['general_inquiry']
}

function buildFindings(snapshot: RepoSnapshot): string[] {
  const findings: string[] = []
  if (snapshot.testSignals.testFileCount === 0) findings.push('0% test coverage signal on detected source files')
  if (snapshot.ciSignals.workflowFiles.length === 0) findings.push('No CI workflow detected in .github/workflows/')
  if (snapshot.topSourceFiles.length > 0) findings.push(`Largest file: ${snapshot.topSourceFiles[0].path} (${snapshot.topSourceFiles[0].size} bytes)`)
  if (snapshot.deepAnalysis?.riskSignals.length) findings.push(...snapshot.deepAnalysis.riskSignals)
  return findings
}


export function synthesizeAuditReport(projectId: string, snapshot: RepoSnapshot): AuditReport {
  const riskCount = snapshot.deepAnalysis?.riskSignals.length || 0
  const anyCount = snapshot.topSourceFiles
    .map((f) => (f.snippet?.match(/any/g) || []).length)
    .reduce((a, b) => a + b, 0)
  const outdated = snapshot.dependencySummary.outdatedHints.length
  const cves = snapshot.dependencySummary.outdatedHints.filter((v) => /cve/i.test(v)).length

  const architectureScore = clampScore(10 - Math.floor(riskCount / 2), 1, 10)
  const perfScore = clampScore(10 - Math.floor((snapshot.harborSignals?.loadTimeMs || 2200) / 500), 1, 10)
  const testCoverageScore = Math.min(100, snapshot.testSignals.testFileCount * 5)

  const topRecommendations = buildAuditRecommendations(snapshot)
  const estimatedTotalHours = topRecommendations.reduce((sum, rec) => sum + rec.effortHours, 0)

  return {
    projectId,
    architectureScore,
    security: {
      grade: snapshot.harborSignals?.securityGrade || deriveSecurityGrade(riskCount),
      findings: (snapshot.harborSignals?.securityFindings?.length || 0) + riskCount
    },
    performance: {
      score: perfScore,
      loadTimeMs: snapshot.harborSignals?.loadTimeMs
    },
    testCoverageScore,
    dependencyHealth: { outdated, cves },
    codeQuality: {
      grade: anyCount > 50 ? 'C' : anyCount > 20 ? 'B-' : 'B+',
      anyCount
    },
    topRecommendations,
    estimatedTotalHours,
    generatedAt: new Date().toISOString()
  }
}

function buildAuditRecommendations(snapshot: RepoSnapshot): Array<{ title: string; severity: string; effortHours: number }> {
  const recs: Array<{ title: string; severity: string; effortHours: number }> = []

  if (snapshot.harborSignals?.securityGrade && ['D', 'E', 'F', 'C'].includes(snapshot.harborSignals.securityGrade)) {
    recs.push({ title: 'Improve security headers + CSP', severity: 'high', effortHours: 3 })
  }
  if (snapshot.testSignals.testFileCount === 0) {
    recs.push({ title: 'Add integration tests for auth + payments', severity: 'medium', effortHours: 12 })
  }
  if (snapshot.dependencySummary.outdatedHints.length > 0) {
    recs.push({ title: 'Upgrade deprecated dependencies', severity: 'medium', effortHours: 2 })
  }
  if ((snapshot.harborSignals?.loadTimeMs || 0) > 2500) {
    recs.push({ title: 'Address dashboard/query performance bottlenecks', severity: 'high', effortHours: 8 })
  }
  if (!snapshot.ciSignals.workflowFiles.length) {
    recs.push({ title: 'Add CI workflow gates for quality/security', severity: 'medium', effortHours: 2 })
  }

  while (recs.length < 5) {
    recs.push({ title: 'Refactor key business logic modules', severity: 'medium', effortHours: 4 })
  }
  return recs.slice(0, 5)
}

function deriveSecurityGrade(riskCount: number): string {
  if (riskCount <= 1) return 'A'
  if (riskCount <= 3) return 'B'
  if (riskCount <= 5) return 'C'
  return 'D'
}

function clampScore(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
