/// <reference types="@cloudflare/workers-types" />

import { enforceRateLimit, isAdminAuthorized, registerProjectToken, requireTenantApiKey, validateProjectToken } from './auth'
import { runDeepAnalysis, synthesizeAuditReport, synthesizeLeadSummary } from './analysis'
import { buildSystemPrompt, callClaude, evolveConversationState, getConversationState, saveConversationState } from './chat'
import { buildRepoSnapshot, exchangeGitHubToken } from './github'
import { getLead, listLeads } from './inbox'
import { estimateEffortFromBenchmark, getPricingBenchmark, ingestGlobalBenchmark } from './pricing'
import { runHarborScan } from './harbor'
import { buildDeliveryPlan, markTaskProgress } from './delivery'
import { gatherClientIntelligence } from './intelligence'
import { choosePromptVariant, composePromptByVariant } from './prompts'
import { emitWebhook } from './webhooks'
import { analyzeUpworkJob } from './upwork'
import { runGhostHunt } from './hunt'
import { buildContractPackage, buildContractSendDraft, renderContractPackage } from './contract'
import { analyzeScopeCreep, summarizeScopeEvents } from './scope'
import { queryPricingOracle, scoreClientLtv } from './oracle'
import { aggregateMarketSignals, normalizeMarketSignal } from './oracle_market'
import { rankPipeline } from './pipeline_rank'
import { businessOpsHealth } from './ops_health'
import { buildDeliveryProof, buildDeliveryPublication } from './proof'
import { buildPortfolioCase } from './portfolio'
import { benchmarkAgents, optimizeAgentPlan } from './agents_market'
import { buildRetainerPlan, buildRetainerReport, buildRetainerRun } from './retainer'
import type { ChatMessage, Env, RepoSnapshot, TenantAccount } from './types'

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: jsonHeaders })

    const url = new URL(request.url)
    try {
      if (url.pathname === '/projects/register' && request.method === 'POST') {
        const body = await readJson(request)
        if (!body.projectId || !body.token) throw new HttpError(400, 'Missing projectId/token')
        await registerProjectToken(body.projectId, body.token, env)
        return ok({ success: true })
      }

      if (url.pathname === '/github/token' && request.method === 'POST') {
        return ok(await exchangeGitHubToken(await readJson(request), env))
      }


      if (url.pathname === '/pro/register' && request.method === 'POST') {
        const body = await readJson(request)
        if (!body.email || !body.freelancerName) throw new HttpError(400, 'Missing email/freelancerName')

        const tenantId = crypto.randomUUID()
        const apiKey = `mc_${crypto.randomUUID().replace(/-/g, '')}`
        const now = new Date().toISOString()
        const account: TenantAccount = {
          tenantId,
          email: body.email,
          freelancerName: body.freelancerName,
          plan: 'free',
          apiKey,
          createdAt: now,
          usageMonth: now.slice(0, 7),
          usage: { linksCreated: 0, auditsGenerated: 0 }
        }

        await env.MACROCODER_KV.put(`tenant:${tenantId}`, JSON.stringify(account))
        await env.MACROCODER_KV.put(`tenant-key:${apiKey}`, tenantId)
        return ok({ tenantId, apiKey, plan: account.plan })
      }

      if (url.pathname === '/pro/usage' && request.method === 'GET') {
        const tenant = await requireTenantApiKey(request, env)
        const normalized = await normalizeTenantUsageMonth(tenant, env)
        const limits = getPlanLimits(normalized.plan)
        return ok({ tenant: normalized, limits })
      }

      if (url.pathname === '/pro/track' && request.method === 'POST') {
        const tenant = await requireTenantApiKey(request, env)
        const body = await readJson(request)
        const normalized = await normalizeTenantUsageMonth(tenant, env)

        const event = body.event as 'link_created' | 'audit_generated'
        if (!event) throw new HttpError(400, 'Missing event')

        if (event === 'link_created') normalized.usage.linksCreated += 1
        if (event === 'audit_generated') normalized.usage.auditsGenerated += 1

        enforcePlanQuota(normalized)
        await env.MACROCODER_KV.put(`tenant:${normalized.tenantId}`, JSON.stringify(normalized))
        return ok({ ok: true, usage: normalized.usage, limits: getPlanLimits(normalized.plan) })
      }

      if (url.pathname === '/pro/upgrade' && request.method === 'POST') {
        const body = await readJson(request)
        const tenantId = body.tenantId as string
        const plan = body.plan as 'free' | 'pro' | 'team'
        if (!tenantId || !plan) throw new HttpError(400, 'Missing tenantId/plan')

        const tenant = await env.MACROCODER_KV.get(`tenant:${tenantId}`, 'json') as TenantAccount | null
        if (!tenant) throw new HttpError(404, 'Tenant not found')

        const next = { ...tenant, plan }
        await env.MACROCODER_KV.put(`tenant:${tenantId}`, JSON.stringify(next))
        return ok({ ok: true, tenant: next })
      }

      if (url.pathname === '/pro/benchmarks/ingest' && request.method === 'POST') {
        const tenant = await requireTenantApiKey(request, env)
        const body = await readJson(request)
        const benchmark = await ingestGlobalBenchmark(env, {
          stack: body.stack || 'default',
          actualHours: Number(body.actualHours || 0),
          rate: Number(body.rate || 0)
        })
        return ok({ ok: true, tenantId: tenant.tenantId, benchmark })
      }

      if (url.pathname === '/github/snapshot' && request.method === 'POST') {
        const body = await readJson(request)
        await requireProjectAuth(body.projectId, body.token, env)
        const snapshot = await buildRepoSnapshot(body.owner, body.repo, body.githubToken)
        await env.MACROCODER_KV.put(`snapshot:${body.projectId}`, JSON.stringify(snapshot))

        ctx.waitUntil(runBackgroundDeepAnalysis(body.projectId, snapshot, env))
        return ok({ snapshot })
      }




      if (url.pathname.startsWith('/upwork/analyze/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/upwork/analyze/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)
        if (!body.jobUrl) throw new HttpError(400, 'Missing jobUrl')

        const snapshot = await getSnapshot(projectId, env)
        const upworkIntelligence = await analyzeUpworkJob(body.jobUrl)
        const updated: RepoSnapshot = { ...snapshot, upworkIntelligence }

        await env.MACROCODER_KV.put(`snapshot:${projectId}`, JSON.stringify(updated))
        return ok({ upworkIntelligence })
      }


      if (url.pathname === '/upwork/hunt' && request.method === 'POST') {
        const body = await readJson(request)
        const hunt = runGhostHunt({
          stacks: Array.isArray(body.stacks) ? body.stacks : [],
          budgetMin: Number(body.budgetMin || 1000),
          clientsVerified: Boolean(body.clientsVerified)
        })
        return ok(hunt)
      }

      if (url.pathname.startsWith('/intelligence/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/intelligence/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)

        const snapshot = await getSnapshot(projectId, env)
        const intelligence = await gatherClientIntelligence(snapshot, body.githubToken)
        const withIntel: RepoSnapshot = { ...snapshot, clientIntelligence: intelligence }

        if (body.upworkJobUrl) {
          withIntel.upworkIntelligence = await analyzeUpworkJob(body.upworkJobUrl)
        }

        await env.MACROCODER_KV.put(`snapshot:${projectId}`, JSON.stringify(withIntel))
        await emitWebhook('client.connected', { projectId, intelligence: intelligence.summary }, env)
        return ok({ intelligence })
      }

      if (url.pathname.startsWith('/delivery/plan/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/delivery/plan/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)

        const conversation = await env.MACROCODER_KV.get(`conversation:${projectId}`, 'json') as any
        const snapshot = await getSnapshot(projectId, env)
        const summary = conversation?.structuredSummary || null

        const mode = (body.mode === 'auto' ? 'auto' : 'assist') as 'assist' | 'auto'
        const plan = buildDeliveryPlan(projectId, summary, snapshot, mode)

        await env.MACROCODER_KV.put(`delivery-plan:${projectId}`, JSON.stringify(plan))
        return ok({ plan })
      }

      if (url.pathname.startsWith('/delivery/status/') && request.method === 'GET') {
        const projectId = url.pathname.replace('/delivery/status/', '')
        const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim()
        await requireProjectAuth(projectId, token, env)

        const plan = await env.MACROCODER_KV.get(`delivery-plan:${projectId}`, 'json')
        return plan ? ok({ plan }) : error(404, 'Delivery plan not found')
      }

      if (url.pathname.startsWith('/delivery/task/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/delivery/task/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)

        const plan = await env.MACROCODER_KV.get(`delivery-plan:${projectId}`, 'json') as any
        if (!plan) throw new HttpError(404, 'Delivery plan not found')

        const next = markTaskProgress(plan, body.taskId, body.status || 'running')
        await env.MACROCODER_KV.put(`delivery-plan:${projectId}`, JSON.stringify(next))
        return ok({ plan: next })
      }



      if (url.pathname.startsWith('/contract/generate/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/contract/generate/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)

        const conversation = await env.MACROCODER_KV.get(`conversation:${projectId}`, 'json') as any
        const summary = conversation?.structuredSummary || null
        const deliveryPlan = await env.MACROCODER_KV.get(`delivery-plan:${projectId}`, 'json') as any
        const contract = buildContractPackage(projectId, Number(body.rate || 85), summary, deliveryPlan)
        await env.MACROCODER_KV.put(`contract:${projectId}`, JSON.stringify(contract))
        return ok(contract)
      }


      if (url.pathname.startsWith('/contract/render/') && request.method === 'GET') {
        const projectId = url.pathname.replace('/contract/render/', '')
        const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim()
        await requireProjectAuth(projectId, token, env)

        const contract = await env.MACROCODER_KV.get(`contract:${projectId}`, 'json') as any
        if (!contract) throw new HttpError(404, 'Contract not found')
        return ok(renderContractPackage(contract))
      }


      if (url.pathname.startsWith('/contract/send/') && request.method === 'GET') {
        const projectId = url.pathname.replace('/contract/send/', '')
        const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim()
        await requireProjectAuth(projectId, token, env)

        const contract = await env.MACROCODER_KV.get(`contract:${projectId}`, 'json') as any
        if (!contract) throw new HttpError(404, 'Contract not found')
        const rendered = renderContractPackage(contract)
        return ok(buildContractSendDraft(rendered))
      }

      if (url.pathname.startsWith('/scope/analyze/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/scope/analyze/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)
        if (!body.message) throw new HttpError(400, 'Missing message')

        const conversation = await env.MACROCODER_KV.get(`conversation:${projectId}`, 'json') as any
        const summary = conversation?.structuredSummary || null
        const result = analyzeScopeCreep(String(body.message), summary, Number(body.rate || 85))
        const key = `scope-events:${projectId}`
        const events = (await env.MACROCODER_KV.get(key, 'json') as any[]) || []
        const nextEvents = [...events, { at: new Date().toISOString(), message: body.message, result }]
        await env.MACROCODER_KV.put(key, JSON.stringify(nextEvents.slice(-50)))
        return ok({ projectId, ...result })
      }


      if (url.pathname.startsWith('/scope/summary/') && request.method === 'GET') {
        const projectId = url.pathname.replace('/scope/summary/', '')
        const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim()
        await requireProjectAuth(projectId, token, env)

        const events = (await env.MACROCODER_KV.get(`scope-events:${projectId}`, 'json') as any[]) || []
        return ok({ projectId, summary: summarizeScopeEvents(events), events })
      }

      if (url.pathname === '/oracle/query' && request.method === 'POST') {
        const body = await readJson(request)
        const stack = String(body.stack || 'default')
        const geo = body.geo ? String(body.geo) : undefined
        const benchmark = await getPricingBenchmark(env, stack.split(/[,+]/))
        const marketSignals = (await env.MACROCODER_KV.get('oracle-market-signals', 'json') as any[]) || []
        const marketBlend = aggregateMarketSignals(marketSignals as any, stack, geo)
        const answer = queryPricingOracle({
          question: String(body.question || 'What should I charge?'),
          stack,
          geo,
          budget: body.budget ? String(body.budget) : undefined,
          marketBlend
        }, benchmark)
        return ok(answer)
      }


      if (url.pathname === '/oracle/market/ingest' && request.method === 'POST') {
        if (!isAdminAuthorized(request, env)) throw new HttpError(401, 'Unauthorized')
        const body = await readJson(request)
        const key = 'oracle-market-signals'
        const existing = (await env.MACROCODER_KV.get(key, 'json') as any[]) || []
        const signal = normalizeMarketSignal(body)
        const next = [...existing, signal].slice(-500)
        await env.MACROCODER_KV.put(key, JSON.stringify(next))
        return ok({ signal, count: next.length })
      }

      if (url.pathname.startsWith('/ltv/score/') && request.method === 'GET') {
        const projectId = url.pathname.replace('/ltv/score/', '')
        const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim()
        await requireProjectAuth(projectId, token, env)

        const snapshot = await getSnapshot(projectId, env)
        const conversation = await env.MACROCODER_KV.get(`conversation:${projectId}`, 'json') as any
        return ok({ projectId, ...scoreClientLtv(snapshot, conversation) })
      }


      if (url.pathname.startsWith('/delivery/proof/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/delivery/proof/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)

        const snapshot = await getSnapshot(projectId, env)
        const deliveryPlan = await env.MACROCODER_KV.get(`delivery-plan:${projectId}`, 'json') as any
        const conversation = await env.MACROCODER_KV.get(`conversation:${projectId}`, 'json') as any
        const proof = buildDeliveryProof(projectId, snapshot, deliveryPlan, conversation)
        await env.MACROCODER_KV.put(`delivery-proof:${projectId}`, JSON.stringify(proof))
        return ok({ proof })
      }


      if (url.pathname.startsWith('/delivery/publish/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/delivery/publish/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)

        const proof = await env.MACROCODER_KV.get(`delivery-proof:${projectId}`, 'json') as any
        if (!proof) throw new HttpError(404, 'Delivery proof not found')
        const contract = await env.MACROCODER_KV.get(`contract:${projectId}`, 'json') as any
        const contractRender = contract ? renderContractPackage(contract) : null
        const scopeSummary = await env.MACROCODER_KV.get(`scope-events:${projectId}`, 'json') as any[] || []
        const retainerRuns = await env.MACROCODER_KV.get(`retainer-runs:${projectId}`, 'json') as any[] || []
        const publication = buildDeliveryPublication({
          projectId,
          proof,
          contractRender,
          scopeSummary: { summary: summarizeScopeEvents(scopeSummary) },
          retainerRun: retainerRuns[retainerRuns.length - 1]
        })
        await env.MACROCODER_KV.put(`delivery-publication:${projectId}`, JSON.stringify(publication))
        return ok({ publication })
      }

      if (url.pathname.startsWith('/portfolio/case/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/portfolio/case/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)

        const snapshot = await getSnapshot(projectId, env)
        const conversation = await env.MACROCODER_KV.get(`conversation:${projectId}`, 'json') as any
        const summary = conversation?.structuredSummary || null
        const proof = await env.MACROCODER_KV.get(`delivery-proof:${projectId}`, 'json') as any
        const caseStudy = buildPortfolioCase(projectId, snapshot, summary, proof)

        const key = `portfolio-case:${projectId}`
        await env.MACROCODER_KV.put(key, JSON.stringify(caseStudy))
        return ok({ caseStudy })
      }

      if (url.pathname === '/portfolio/list' && request.method === 'GET') {
        const limit = clampNumber(url.searchParams.get('limit'), 1, 100, 25)
        const list = await env.MACROCODER_KV.list({ prefix: 'portfolio-case:' })
        const cases: any[] = []
        for (const item of list.keys) {
          const row = await env.MACROCODER_KV.get(item.name, 'json') as any
          if (row) cases.push(row)
        }
        cases.sort((a, b) => String(b.generatedAt || '').localeCompare(String(a.generatedAt || '')))
        return ok({ cases: cases.slice(0, limit), total: cases.length, limit })
      }


      if (url.pathname.startsWith('/retainer/create/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/retainer/create/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)

        const monthlyUsd = Math.max(500, Number(body.monthlyUsd || 2000))
        const hours = Math.max(5, Number(body.hours || 25))
        const plan = buildRetainerPlan(projectId, monthlyUsd, hours)
        await env.MACROCODER_KV.put(`retainer:${projectId}`, JSON.stringify(plan))
        return ok({ plan })
      }

      if (url.pathname.startsWith('/retainer/report/') && request.method === 'GET') {
        const projectId = url.pathname.replace('/retainer/report/', '')
        const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim()
        await requireProjectAuth(projectId, token, env)

        const plan = await env.MACROCODER_KV.get(`retainer:${projectId}`, 'json') as any
        if (!plan) throw new HttpError(404, 'Retainer plan not found')

        const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7)
        const report = buildRetainerReport(plan, month)
        return ok({ report })
      }


      if (url.pathname.startsWith('/retainer/run/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/retainer/run/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)

        const plan = await env.MACROCODER_KV.get(`retainer:${projectId}`, 'json') as any
        if (!plan) throw new HttpError(404, 'Retainer plan not found')

        const run = buildRetainerRun(plan, {
          week: Number(body.week || 1),
          vulnerabilities: Number(body.vulnerabilities || 0),
          performanceDeltaPct: Number(body.performanceDeltaPct || 0)
        })
        const key = `retainer-runs:${projectId}`
        const existing = (await env.MACROCODER_KV.get(key, 'json') as any[]) || []
        await env.MACROCODER_KV.put(key, JSON.stringify([...existing, run].slice(-24)))
        return ok({ run })
      }

      if (url.pathname === '/agents/benchmark' && request.method === 'GET') {
        const stack = url.searchParams.get('stack') || 'nextjs'
        return ok(benchmarkAgents(stack))
      }

      if (url.pathname.startsWith('/agents/optimize/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/agents/optimize/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)
        const stack = String(body.stack || 'nextjs')
        const task = body.task ? String(body.task) : undefined
        return ok(optimizeAgentPlan({ stack, task }))
      }


      if (url.pathname === '/pipeline/prioritize' && request.method === 'GET') {
        const limit = clampNumber(url.searchParams.get('limit'), 1, 200, 50)
        const snapshots = await env.MACROCODER_KV.list({ prefix: 'snapshot:' })
        const leads: any[] = []

        for (const item of snapshots.keys.slice(0, 300)) {
          const projectId = item.name.replace('snapshot:', '')
          const snapshot = await env.MACROCODER_KV.get(item.name, 'json') as any
          if (!snapshot) continue
          const conversation = await env.MACROCODER_KV.get(`conversation:${projectId}`, 'json') as any
          const ltv = scoreClientLtv(snapshot, conversation)
          const conversion = estimateConversionProbability(conversation || {}, snapshot)
          leads.push({
            projectId,
            client: conversation?.structuredSummary?.client_name || projectId,
            ltvScore: ltv.score,
            conversionProbability: conversion,
            budget: conversation?.structuredSummary?.budget_stated,
            recommendation: ltv.verdict === 'high' ? 'Prioritize and offer retainer option.' : ltv.verdict === 'medium' ? 'Keep warm with structured follow-up.' : 'Low priority; enforce strict minimum scope.'
          })
        }

        const ranked = rankPipeline(leads as any)
        return ok({ ...ranked, leads: ranked.leads.slice(0, limit), limit, total: ranked.leads.length })
      }




      if (url.pathname === '/ops/smoke' && request.method === 'GET') {
        const started = Date.now()
        const checks: Array<{ name: string; ok: boolean; note?: string }> = []

        try {
          const oracle = queryPricingOracle({ question: 'smoke', stack: 'nextjs' }, { stack: 'nextjs', avgHours: 40, avgRate: 80, sampleSize: 1 })
          checks.push({ name: 'oracle_query', ok: !!oracle?.recommendation?.recommendedRate })
        } catch (err: any) {
          checks.push({ name: 'oracle_query', ok: false, note: String(err?.message || err) })
        }

        try {
          const plan = buildRetainerPlan('smoke', 2000, 25)
          const run = buildRetainerRun(plan, { week: 1, vulnerabilities: 0, performanceDeltaPct: 3 })
          const report = buildRetainerReport(plan, '2026-01')
          checks.push({ name: 'retainer_cycle', ok: Boolean(run?.action && report?.invoiceUsd) })
        } catch (err: any) {
          checks.push({ name: 'retainer_cycle', ok: false, note: String(err?.message || err) })
        }

        try {
          const ranked = rankPipeline([{ projectId: 'p1', client: 'c1', ltvScore: 70, conversionProbability: 60, recommendation: 'x' }])
          checks.push({ name: 'pipeline_rank', ok: ranked.top.length === 1 })
        } catch (err: any) {
          checks.push({ name: 'pipeline_rank', ok: false, note: String(err?.message || err) })
        }

        try {
          const health = businessOpsHealth({ links: 1, conversations: 1, contracts: 1, deliveryProofs: 1, retainers: 1, portfolioCases: 1 })
          checks.push({ name: 'ops_health', ok: health.score > 0 })
        } catch (err: any) {
          checks.push({ name: 'ops_health', ok: false, note: String(err?.message || err) })
        }

        const passed = checks.filter((c) => c.ok).length
        return ok({
          ranAt: new Date().toISOString(),
          durationMs: Date.now() - started,
          passed,
          total: checks.length,
          ok: passed === checks.length,
          checks
        })
      }

      if (url.pathname === '/ops/readiness' && request.method === 'GET') {
        const [tokens, snapshots, conversations, contracts, proofs, retainers] = await Promise.all([
          env.MACROCODER_KV.list({ prefix: 'project-token:' }),
          env.MACROCODER_KV.list({ prefix: 'snapshot:' }),
          env.MACROCODER_KV.list({ prefix: 'conversation:' }),
          env.MACROCODER_KV.list({ prefix: 'contract:' }),
          env.MACROCODER_KV.list({ prefix: 'delivery-proof:' }),
          env.MACROCODER_KV.list({ prefix: 'retainer:' }),
        ])

        const checks = [
          { name: 'project_tokens', ok: tokens.keys.length > 0, count: tokens.keys.length, required: 1 },
          { name: 'snapshots', ok: snapshots.keys.length > 0, count: snapshots.keys.length, required: 1 },
          { name: 'conversations', ok: conversations.keys.length > 0, count: conversations.keys.length, required: 1 },
          { name: 'contracts', ok: contracts.keys.length > 0, count: contracts.keys.length, required: 1 },
          { name: 'delivery_proofs', ok: proofs.keys.length > 0, count: proofs.keys.length, required: 1 },
          { name: 'retainers', ok: true, count: retainers.keys.length, required: 0 }
        ]

        const passed = checks.filter((c) => c.ok).length
        const score = Math.round((passed / checks.length) * 100)
        const blockers = checks.filter((c) => !c.ok).map((c) => `${c.name} below required threshold`)

        return ok({
          generatedAt: new Date().toISOString(),
          score,
          status: blockers.length ? 'needs_attention' : 'ready',
          checks,
          blockers
        })
      }

      if (url.pathname === '/ops/health' && request.method === 'GET') {
        const [links, convs, contracts, proofs, retainers, portfolio] = await Promise.all([
          env.MACROCODER_KV.list({ prefix: 'project-token:' }),
          env.MACROCODER_KV.list({ prefix: 'conversation:' }),
          env.MACROCODER_KV.list({ prefix: 'contract:' }),
          env.MACROCODER_KV.list({ prefix: 'delivery-proof:' }),
          env.MACROCODER_KV.list({ prefix: 'retainer:' }),
          env.MACROCODER_KV.list({ prefix: 'portfolio-case:' }),
        ])
        const health = businessOpsHealth({
          links: links.keys.length,
          conversations: convs.keys.length,
          contracts: contracts.keys.length,
          deliveryProofs: proofs.keys.length,
          retainers: retainers.keys.length,
          portfolioCases: portfolio.keys.length
        })
        return ok({
          ...health,
          ratios: {
            contractsPerConversation: convs.keys.length ? Number((contracts.keys.length / convs.keys.length).toFixed(2)) : 0,
            proofsPerContract: contracts.keys.length ? Number((proofs.keys.length / contracts.keys.length).toFixed(2)) : 0,
            retainersPerContract: contracts.keys.length ? Number((retainers.keys.length / contracts.keys.length).toFixed(2)) : 0
          }
        })
      }

      if (url.pathname.startsWith('/replay/') && request.method === 'GET') {
        const projectId = url.pathname.replace('/replay/', '')
        const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim()
        await requireProjectAuth(projectId, token, env)

        const conversation = await env.MACROCODER_KV.get(`conversation:${projectId}`, 'json') as any
        const snapshot = await getSnapshot(projectId, env)
        if (!conversation) throw new HttpError(404, 'Conversation not found')

        const timeline = buildReplayTimeline(conversation, snapshot)
        return ok({ projectId, timeline, conversionProbability: estimateConversionProbability(conversation, snapshot) })
      }


      if (url.pathname.startsWith('/chat/abandoned-check/') && request.method === 'POST') {
        const projectId = url.pathname.replace('/chat/abandoned-check/', '')
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)

        const conversation = await env.MACROCODER_KV.get(`conversation:${projectId}`, 'json') as any
        const count = Array.isArray(conversation?.conversation) ? conversation.conversation.length : 0
        if (count > 0 && count <= 2) {
          await emitWebhook('chat.abandoned', { projectId, messages: count }, env)
          return ok({ abandoned: true, messages: count })
        }
        return ok({ abandoned: false, messages: count })
      }

      if (url.pathname === '/analytics/winloss' && request.method === 'GET') {
        if (!isAdminAuthorized(request, env)) throw new HttpError(401, 'Unauthorized')
        const analytics = await buildWinLossAnalytics(env)
        return ok(analytics)
      }

      if (url.pathname === '/chat' && request.method === 'POST') {
        const body = await readJson(request)
        const { projectId, token, messages } = body as { projectId: string; token: string; messages: ChatMessage[] }
        if (!Array.isArray(messages) || messages.length === 0) throw new HttpError(400, 'Messages are required')

        await requireProjectAuth(projectId, token, env)

        const rate = await enforceRateLimit(projectId, request.headers.get('cf-connecting-ip') || '', env)
        if (!rate.allowed) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded', resetAt: rate.resetAt }), {
            status: 429,
            headers: { ...jsonHeaders, 'content-type': 'application/json' }
          })
        }

        const snapshot = await getSnapshot(projectId, env)
        const state = await getConversationState(projectId, env)
        const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
        const nextState = evolveConversationState(state, lastUserMessage)
        await saveConversationState(nextState, env)

        const benchmark = await getPricingBenchmark(env, snapshot.stack.frameworks)
        const baseSystem = buildSystemPrompt({
          projectId,
          snapshot,
          state: nextState,
          pricingContext: { avgHours: benchmark.avgHours, sampleSize: benchmark.sampleSize }
        })

        const variantKey = `prompt-variant:${projectId}`
        let variant = await env.MACROCODER_KV.get(variantKey)
        if (!variant) {
          variant = choosePromptVariant(Date.now() + projectId.length)
          await env.MACROCODER_KV.put(variantKey, variant)
        }

        const system = composePromptByVariant(variant as any, baseSystem, snapshot, nextState)
        await emitWebhook('chat.started', { projectId, promptVariant: variant }, env)

        const claude = await callClaude(env, system, messages)
        const claudeJson = await claude.json<unknown>()
        await saveConversationAppend(projectId, messages, claudeJson, snapshot, env)

        const latestUser = lastUserMessage || ''
        const budget = latestUser.match(/\$\s?\d[\d,]*(?:\s?-\s?\$?\d[\d,]*)?/)?.[0]
        if (budget) await emitWebhook('budget.disclosed', { projectId, budget }, env)

        return ok({ response: claudeJson, state: nextState, rateRemaining: rate.remaining, promptVariant: variant })
      }


      if (url.pathname === '/audit/create' && request.method === 'POST') {
        const body = await readJson(request)
        await requireProjectAuth(body.projectId, body.token, env)

        const auditId = crypto.randomUUID()
        const checkoutUrl = await createAuditCheckout(auditId, body.projectId, env)
        await env.MACROCODER_KV.put(`audit:${auditId}`, JSON.stringify({
          auditId,
          projectId: body.projectId,
          status: checkoutUrl ? 'pending_payment' : 'paid',
          createdAt: new Date().toISOString()
        }))

        return ok({ auditId, checkoutUrl })
      }


      if (url.pathname.startsWith('/audit/mark-paid/') && request.method === 'POST') {
        if (!isAdminAuthorized(request, env)) throw new HttpError(401, 'Unauthorized')
        const auditId = url.pathname.replace('/audit/mark-paid/', '')
        const audit = await env.MACROCODER_KV.get(`audit:${auditId}`, 'json') as any
        if (!audit) throw new HttpError(404, 'Audit not found')
        const next = { ...audit, status: 'paid', paidAt: new Date().toISOString() }
        await env.MACROCODER_KV.put(`audit:${auditId}`, JSON.stringify(next))
        return ok({ success: true })
      }

      if (url.pathname.startsWith('/audit/report/') && request.method === 'GET') {
        const auditId = url.pathname.replace('/audit/report/', '')
        const audit = await env.MACROCODER_KV.get(`audit:${auditId}`, 'json') as any
        if (!audit) throw new HttpError(404, 'Audit not found')

        const authHeader = request.headers.get('authorization') || ''
        const token = authHeader.replace('Bearer ', '').trim()
        await requireProjectAuth(audit.projectId, token, env)

        if (audit.status !== 'paid') throw new HttpError(402, 'Audit payment required')

        const snapshot = await getSnapshot(audit.projectId, env)
        const report = synthesizeAuditReport(audit.projectId, snapshot)
        await env.MACROCODER_KV.put(`audit-report:${auditId}`, JSON.stringify(report))
        return ok({ auditId, report })
      }

      if (url.pathname === '/conversations' && request.method === 'POST') {
        const body = await readJson(request)
        await requireProjectAuth(body.projectId, body.token, env)
        await env.MACROCODER_KV.put(`conversation:${body.projectId}`, JSON.stringify(body))
        return ok({ success: true })
      }

      if (url.pathname.startsWith('/conversations/') && url.pathname.endsWith('/finalize') && request.method === 'POST') {
        const projectId = url.pathname.split('/')[2]
        const body = await readJson(request)
        await requireProjectAuth(projectId, body.token, env)

        const conversation = await env.MACROCODER_KV.get(`conversation:${projectId}`, 'json') as any
        if (!conversation) throw new HttpError(404, 'No conversation to finalize')

        const snapshot = await getSnapshot(projectId, env)
        const transcript = flattenTranscript(conversation.conversation || [])
        const benchmark = await getPricingBenchmark(env, snapshot.stack.frameworks)
        const complexity = (snapshot.deepAnalysis?.riskSignals.length || 0) + (snapshot.topSourceFiles.length > 5 ? 1 : 0)
        const effort = estimateEffortFromBenchmark(benchmark, complexity)

        const structuredSummary = synthesizeLeadSummary({
          clientName: body.clientName || conversation.clientName || 'unknown',
          snapshot,
          transcript,
          budgetEstimate: effort
        })

        const saved = { ...conversation, structuredSummary, finalizedAt: new Date().toISOString() }
        await env.MACROCODER_KV.put(`conversation:${projectId}`, JSON.stringify(saved))
        await emitWebhook('chat.completed', { projectId, summary: structuredSummary.scope_summary, budget: structuredSummary.budget_stated }, env)
        await emitWebhook('followup.due', { projectId, day: 1 }, env)
        return ok({ structuredSummary })
      }

      if (url.pathname.startsWith('/conversations/') && request.method === 'GET') {
        const projectId = url.pathname.replace('/conversations/', '')
        const authHeader = request.headers.get('authorization') || ''
        const token = authHeader.replace('Bearer ', '').trim()
        await requireProjectAuth(projectId, token, env)
        const conversation = await env.MACROCODER_KV.get(`conversation:${projectId}`, 'json')
        return conversation ? ok(conversation) : error(404, 'Not found')
      }

      if (url.pathname === '/inbox' && request.method === 'GET') {
        if (!isAdminAuthorized(request, env)) throw new HttpError(401, 'Unauthorized')
        return ok({ leads: await listLeads(env) })
      }

      if (url.pathname.startsWith('/inbox/') && request.method === 'GET') {
        if (!isAdminAuthorized(request, env)) throw new HttpError(401, 'Unauthorized')
        const projectId = url.pathname.replace('/inbox/', '')
        const lead = await getLead(env, projectId)
        return lead ? ok(lead) : error(404, 'Lead not found')
      }

      return error(404, 'Not found')
    } catch (e: any) {
      if (e instanceof HttpError) return error(e.status, e.message)
      return error(500, e?.message || 'Internal server error')
    }
  }
}


async function readJson(request: Request): Promise<Record<string, any>> {
  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    throw new HttpError(400, 'Invalid JSON payload')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'JSON body must be an object')
  }

  return parsed as Record<string, any>
}

async function runBackgroundDeepAnalysis(projectId: string, snapshot: RepoSnapshot, env: Env) {
  const deepAnalysis = runDeepAnalysis(snapshot)
  const intelligence = await gatherClientIntelligence(snapshot)
  const withDeep: RepoSnapshot = { ...snapshot, deepAnalysis, clientIntelligence: intelligence }
  const harborSignals = await runHarborScan(withDeep, env)
  const merged: RepoSnapshot = harborSignals ? { ...withDeep, harborSignals } : withDeep
  await env.MACROCODER_KV.put(`snapshot:${projectId}`, JSON.stringify(merged))
}

async function requireProjectAuth(projectId: string, token: string, env: Env) {
  if (!projectId || !token) throw new HttpError(401, 'Unauthorized')
  if (!(await validateProjectToken(projectId, token, env))) {
    throw new HttpError(401, 'Unauthorized')
  }
}

async function getSnapshot(projectId: string, env: Env): Promise<RepoSnapshot> {
  const snapshot = await env.MACROCODER_KV.get(`snapshot:${projectId}`, 'json') as RepoSnapshot | null
  if (snapshot) return snapshot
  return {
    owner: 'unknown',
    repo: 'unknown',
    branch: 'main',
    capturedAt: new Date().toISOString(),
    fileTree: [],
    topSourceFiles: [],
    testSignals: { hasTestsDir: false, testFileCount: 0 },
    ciSignals: { workflowFiles: [] },
    stack: { frameworks: [], languages: [], packageManagers: [] },
    dependencySummary: { totalDependencies: 0, outdatedHints: [] }
  }
}

async function saveConversationAppend(
  projectId: string,
  incomingMessages: ChatMessage[],
  claudeJson: any,
  snapshot: RepoSnapshot,
  env: Env
) {
  const existing = await env.MACROCODER_KV.get(`conversation:${projectId}`, 'json') as any
  const assistantText = Array.isArray(claudeJson.content)
    ? claudeJson.content.map((c: any) => c.text).filter(Boolean).join('\n')
    : ''

  const appended = {
    projectId,
    snapshot,
    timestamp: new Date().toISOString(),
    conversation: [
      ...((existing?.conversation as any[]) || []),
      ...incomingMessages,
      { role: 'assistant', content: assistantText }
    ]
  }

  await env.MACROCODER_KV.put(`conversation:${projectId}`, JSON.stringify(appended))
}

function flattenTranscript(messages: Array<{ role: string; content: string }>): string {
  return messages.map((m) => `[${m.role}] ${m.content}`).join('\n')
}

async function createAuditCheckout(auditId: string, projectId: string, env: Env): Promise<string | null> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) return null

  const origin = env.APP_BASE_URL || 'https://macrocoder.dev'
  const form = new URLSearchParams()
  form.set('mode', 'payment')
  form.set('line_items[0][price]', env.STRIPE_PRICE_ID)
  form.set('line_items[0][quantity]', '1')
  form.set('success_url', `${origin}/audit/success?auditId=${auditId}`)
  form.set('cancel_url', `${origin}/audit/cancel?auditId=${auditId}`)
  form.set('metadata[audit_id]', auditId)
  form.set('metadata[project_id]', projectId)

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: form.toString()
  })

  if (!response.ok) return null
  const json = await response.json<unknown>()
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null
  const url = (json as Record<string, any>).url
  return typeof url === 'string' ? url : null
}


function clampNumber(value: string | null, min: number, max: number, fallback: number): number {
  if (!value) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.floor(n)))
}

function ok(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...jsonHeaders, 'content-type': 'application/json' }
  })
}

function error(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...jsonHeaders, 'content-type': 'application/json' }
  })
}


function getPlanLimits(plan: TenantAccount['plan']) {
  if (plan === 'free') return { linksPerMonth: 3, auditsPerMonth: 3 }
  if (plan === 'pro') return { linksPerMonth: 9999, auditsPerMonth: 9999 }
  return { linksPerMonth: 99999, auditsPerMonth: 99999 }
}

async function normalizeTenantUsageMonth(tenant: TenantAccount, env: Env): Promise<TenantAccount> {
  const month = new Date().toISOString().slice(0, 7)
  if (tenant.usageMonth === month) return tenant

  const reset: TenantAccount = {
    ...tenant,
    usageMonth: month,
    usage: { linksCreated: 0, auditsGenerated: 0 }
  }
  await env.MACROCODER_KV.put(`tenant:${tenant.tenantId}`, JSON.stringify(reset))
  return reset
}

function enforcePlanQuota(tenant: TenantAccount) {
  const limits = getPlanLimits(tenant.plan)
  if (tenant.usage.linksCreated > limits.linksPerMonth) {
    throw new HttpError(402, `Plan quota exceeded: links/month (${limits.linksPerMonth})`)
  }
  if (tenant.usage.auditsGenerated > limits.auditsPerMonth) {
    throw new HttpError(402, `Plan quota exceeded: audits/month (${limits.auditsPerMonth})`)
  }
}


function buildReplayTimeline(conversation: any, snapshot: RepoSnapshot): Array<{ ts: string; note: string; annotation: string }> {
  const messages = Array.isArray(conversation.conversation) ? conversation.conversation : []
  const startedAt = conversation.timestamp || new Date().toISOString()
  const rows: Array<{ ts: string; note: string; annotation: string }> = [
    {
      ts: startedAt,
      note: `Client connected. Snapshot: ${snapshot.stack.frameworks.join(' + ') || 'unknown'}; ${snapshot.fileTree.length} files.`,
      annotation: 'Context established.'
    }
  ]

  let budgetSeen = false
  for (const msg of messages) {
    const content = String(msg.content || '')
    if (!budgetSeen) {
      const budget = content.match(/\$\s?\d[\d,]*(?:\s?-\s?\$?\d[\d,]*)?/)?.[0]
      if (budget) {
        rows.push({
          ts: conversation.timestamp || startedAt,
          note: `Budget disclosed: ${budget}`,
          annotation: '⚠️ Compare against estimate and propose phased delivery.'
        })
        budgetSeen = true
      }
    }
  }

  rows.push({ ts: new Date().toISOString(), note: 'Chat ended. Summary saved.', annotation: '✅ Ready for proposal and follow-up.' })
  return rows
}

function estimateConversionProbability(conversation: any, snapshot: RepoSnapshot): number {
  const messages = Array.isArray(conversation.conversation) ? conversation.conversation.length : 0
  const hasBudget = JSON.stringify(conversation).includes('$')
  const base = hasBudget ? 65 : 45
  const engagement = Math.min(25, messages * 3)
  const riskPenalty = Math.min(20, snapshot.deepAnalysis?.riskSignals.length || 0)
  return Math.max(5, Math.min(95, base + engagement - riskPenalty))
}

async function buildWinLossAnalytics(env: Env): Promise<Record<string, any>> {
  const list = await env.MACROCODER_KV.list({ prefix: 'conversation:' })
  let chatted = 0
  let disclosedBudget = 0
  let completed = 0
  const promptPerf: Record<string, { total: number; withBudget: number }> = {}

  for (const key of list.keys) {
    const projectId = key.name.replace('conversation:', '')
    const conv = await env.MACROCODER_KV.get(key.name, 'json') as any
    if (!conv) continue
    chatted += 1
    const text = JSON.stringify(conv)
    if (/\$\s?\d/.test(text)) disclosedBudget += 1
    if (conv.structuredSummary) completed += 1

    const variant = (await env.MACROCODER_KV.get(`prompt-variant:${projectId}`)) || 'unknown'
    if (!promptPerf[variant]) promptPerf[variant] = { total: 0, withBudget: 0 }
    promptPerf[variant].total += 1
    if (/\$\s?\d/.test(text)) promptPerf[variant].withBudget += 1
  }

  return {
    chatted,
    completed,
    budgetDisclosureRate: chatted ? (disclosedBudget / chatted) * 100 : 0,
    promptPerformance: Object.entries(promptPerf).map(([variant, stats]) => ({
      variant,
      conversations: stats.total,
      budgetDisclosureRate: stats.total ? (stats.withBudget / stats.total) * 100 : 0
    }))
  }
}
