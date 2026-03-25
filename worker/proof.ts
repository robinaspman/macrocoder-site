import type { RepoSnapshot } from './types'

export function buildDeliveryProof(projectId: string, snapshot: RepoSnapshot, deliveryPlan: any, conversation: any) {
  const tasks = Array.isArray(deliveryPlan?.tasks) ? deliveryPlan.tasks : []
  const completed = tasks.filter((t: any) => t.status === 'completed').length
  const findings = snapshot.deepAnalysis?.riskSignals || []
  const summary = conversation?.structuredSummary || {}

  const digestInput = JSON.stringify({ projectId, snapshot: snapshot.fileTree.slice(0, 300), tasks, summary, findings })
  const hash = simpleHash(digestInput)

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    proofHash: hash,
    checklist: {
      filesAnalyzed: snapshot.fileTree.length,
      tasksTotal: tasks.length,
      tasksCompleted: completed,
      riskSignals: findings.length,
      estimatedHours: summary.effort_hours || deliveryPlan?.totalEstimatedHours || null
    },
    verificationUrl: `https://macrocoder.dev/delivery/${projectId}?proof=${hash}`,
    notes: [
      'Package includes analysis snapshot metadata and delivery task trace.',
      'Hash can be used to detect tampering of the generated package.'
    ]
  }
}

function simpleHash(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
  }
  return `mc_${(h >>> 0).toString(16).padStart(8, '0')}`
}


export function buildDeliveryPublication(input: {
  projectId: string
  proof: any
  contractRender?: any
  scopeSummary?: any
  retainerRun?: any
}) {
  return {
    projectId: input.projectId,
    publishedAt: new Date().toISOString(),
    deliveryUrl: `https://macrocoder.dev/delivery/${input.projectId}`,
    package: {
      proofHash: input.proof?.proofHash || null,
      contractChecksum: input.contractRender?.output?.checksum || null,
      scopeAddedValue: input.scopeSummary?.summary?.estimatedAddedValue || 0,
      retainerEscalation: Boolean(input.retainerRun?.escalationSuggested)
    },
    message: 'Delivery package published with verification artifacts and scope/contract context.'
  }
}
