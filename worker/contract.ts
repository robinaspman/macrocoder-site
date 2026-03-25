export function buildContractPackage(projectId: string, rate: number, summary: any, deliveryPlan: any) {
  const scope = summary?.scope_summary || 'Scope refined from intake and technical discovery.'
  const hours = Number(summary?.effort_hours || deliveryPlan?.totalEstimatedHours || 40)
  const milestones = (deliveryPlan?.tasks || []).slice(0, 4).map((task: any, idx: number) => ({
    title: task.title,
    trigger: `Milestone ${idx + 1} accepted`,
    amount: Math.round((Number(task.estimatedHours || 4) * rate) * 100) / 100
  }))

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    totalEstimateHours: hours,
    hourlyRate: rate,
    contractValueEstimate: Math.round(hours * rate),
    markdown: [
      `# Scope of Work — ${projectId}`,
      '',
      '## Deliverables',
      `- ${scope}`,
      '- Timeline and milestones driven by repository analysis and discovery notes.',
      '- Testing and release checklist included before handoff.',
      '',
      '## Milestones',
      ...milestones.map((m: any) => `- ${m.title}: $${m.amount} (${m.trigger})`),
      '',
      '## Terms',
      `- Rate: $${rate}/hr`,
      '- Revision policy: one scoped revision per milestone included.',
      '- Out-of-scope requests are quoted separately before implementation.',
      '- IP assignment transfers at final payment.',
      '',
      '## Technical Appendix',
      '- Architecture decisions follow audit recommendations and risk register.',
      '- QA includes regression tests and deployment checklist.',
    ].join('\n'),
    milestones
  }
}


export function renderContractPackage(contract: any) {
  const markdown = String(contract?.markdown || '')
  return {
    projectId: contract?.projectId || 'unknown',
    renderedAt: new Date().toISOString(),
    output: {
      markdown,
      pseudoPdfUrl: `https://macrocoder.dev/contracts/${contract?.projectId || 'unknown'}.pdf`,
      checksum: checksum(markdown)
    }
  }
}

function checksum(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0
  return `ct_${h.toString(16)}`
}


export function buildContractSendDraft(rendered: any) {
  const url = rendered?.output?.pseudoPdfUrl || 'https://macrocoder.dev/contracts'
  return {
    generatedAt: new Date().toISOString(),
    subject: 'Scope of Work & Contract Package',
    body: `Attached is the SOW package with milestones and terms. PDF: ${url}`,
    attachmentUrl: url
  }
}
