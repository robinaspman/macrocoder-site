export interface Env {
  ANTHROPIC_API_KEY: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  MACROCODER_KV: KVNamespace
  ADMIN_API_TOKEN?: string
  HARBOR_API_URL?: string
  HARBOR_API_TOKEN?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_PRICE_ID?: string
  APP_BASE_URL?: string
  DISCORD_WEBHOOK_URL?: string
  SLACK_WEBHOOK_URL?: string
}

export interface TenantAccount {
  tenantId: string
  email: string
  freelancerName: string
  plan: 'free' | 'pro' | 'team'
  apiKey: string
  createdAt: string
  usageMonth: string
  usage: {
    linksCreated: number
    auditsGenerated: number
  }
}


export interface ClientIntelligence {
  owner: string
  repoCount: number
  totalStars: number
  orgMemberCount?: number
  orgCount: number
  languages: string[]
  packageSignals: string[]
  readmeLinks: string[]
  linkedinUrl?: string
  summary: string
  researchedAt: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface HarborSignals {
  targetUrl: string
  loadTimeMs?: number
  brokenLinks?: number
  seoIssues?: number
  mobileIssues?: number
  securityGrade?: string
  securityFindings?: string[]
  tlsGrade?: string
  fetchedAt: string
}


export interface UpworkIntelligence {
  jobUrl: string
  extractedBudget?: string
  proposalCount?: number
  clientSpend?: string
  clientRating?: string
  requiredSkills: string[]
  skills: string[]
  requirementSignal: 'low' | 'medium' | 'high'
  competitionLevel: 'low' | 'medium' | 'high'
  spendingSignal: 'unknown' | 'low' | 'mid' | 'high'
  historicalPayHint?: string
  summary: string
  analyzedAt: string
}

export interface RepoSnapshot {
  owner: string
  repo: string
  branch: string
  capturedAt: string
  fileTree: string[]
  topSourceFiles: Array<{ path: string; size: number; snippet?: string }>
  testSignals: {
    hasTestsDir: boolean
    testFileCount: number
  }
  ciSignals: {
    workflowFiles: string[]
  }
  stack: {
    frameworks: string[]
    languages: string[]
    packageManagers: string[]
  }
  dependencySummary: {
    totalDependencies: number
    outdatedHints: string[]
  }
  detectedSiteUrl?: string
  readmeContent?: string
  clientIntelligence?: ClientIntelligence
  upworkIntelligence?: UpworkIntelligence
  deepAnalysis?: DeepAnalysis
  harborSignals?: HarborSignals
}

export interface DeepAnalysis {
  architectureSignals: string[]
  deploymentSignals: string[]
  qualitySignals: string[]
  riskSignals: string[]
  completedAt: string
}

export interface AuditReport {
  projectId: string
  architectureScore: number
  security: { grade: string; findings: number }
  performance: { score: number; loadTimeMs?: number }
  testCoverageScore: number
  dependencyHealth: { outdated: number; cves: number }
  codeQuality: { grade: string; anyCount: number }
  topRecommendations: Array<{ title: string; severity: string; effortHours: number }>
  estimatedTotalHours: number
  generatedAt: string
}

export interface ConversationState {
  projectId: string
  stage: 'intake' | 'scope' | 'budget' | 'timeline' | 'synthesis'
  askedScope: boolean
  askedBudget: boolean
  askedTimeline: boolean
  offTopicCount: number
  completionScore: number
  lastUpdated: string
}

export interface LeadSummary {
  client_name: string
  stack: string[]
  scope_summary: string
  budget_stated: string
  budget_estimated: string
  effort_hours: number
  urgency: 'low' | 'medium' | 'high'
  client_signals: string[]
  recommended_rate: string
  recommended_approach: string
  key_findings: string[]
}
