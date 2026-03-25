export function businessOpsHealth(input: {
  links: number
  conversations: number
  contracts: number
  deliveryProofs: number
  retainers: number
  portfolioCases: number
}) {
  const score = Math.min(100, Math.round(
    (input.links > 0 ? 10 : 0) +
    (input.conversations > 0 ? 15 : 0) +
    (input.contracts > 0 ? 15 : 0) +
    (input.deliveryProofs > 0 ? 20 : 0) +
    (input.retainers > 0 ? 20 : 0) +
    (input.portfolioCases > 0 ? 20 : 0)
  ))

  return {
    generatedAt: new Date().toISOString(),
    score,
    status: score >= 85 ? 'operational' : score >= 60 ? 'maturing' : 'bootstrapping',
    details: input
  }
}
