import { useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Sparkles, Globe, Github, Briefcase, Calendar, User, FileText, Tag, ChevronDown } from 'lucide-react'

type InputMode = 'github' | 'website' | 'upwork'

const ANALYSIS_STEPS = [
  { label: 'Fetching source', detail: 'Connecting to repository...' },
  { label: 'Reading structure', detail: 'Mapping file tree and dependencies...' },
  { label: 'Analyzing code', detail: 'Evaluating architecture and patterns...' },
  { label: 'Checking quality', detail: 'Scanning for issues and improvements...' },
  { label: 'Security review', detail: 'Checking for vulnerabilities...' },
  { label: 'Performance scan', detail: 'Evaluating load times and optimization...' },
  { label: 'Generating report', detail: 'Compiling findings and recommendations...' },
  { label: 'Finalized', detail: 'Review complete!' },
]

const STEP_ICONS = [Globe, Globe, Github, Sparkles, Sparkles, Sparkles, Sparkles, CheckCircle2]

export interface StepResult {
  passed: boolean
  detail?: string
  findings?: string[]
}

interface ProjectSummary {
  name?: string
  author?: string
  date?: string
  description?: string
  language?: string
  tags?: string[]
}

interface LoadingOverlayProps {
  mode: InputMode
  sourceUrl: string
  progress: number
  stepIndex: number
  isComplete: boolean
  stepResults?: StepResult[]
  projectSummary?: ProjectSummary
}

export function LoadingOverlay({ mode, sourceUrl, progress, stepIndex, isComplete, stepResults, projectSummary }: LoadingOverlayProps) {
  const SourceIcon = mode === 'github' ? Github : mode === 'website' ? Globe : Briefcase
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  return (
    <div className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Source URL + Project Summary */}
      <div className="rounded-2xl border border-[#24170e] bg-[#110c09]/96 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.55)] max-h-[620px] flex flex-col">
        <div className="flex items-center gap-4 px-8 py-5 border-b border-[#24170e] flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#25180c] text-[#e59a1d]">
            <SourceIcon className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] text-[#8e7963] truncate">
              {mode === 'github' ? 'GitHub Repository' : mode === 'website' ? 'Website' : 'Upwork Job Post'}
            </p>
            <p className="text-[16px] text-[#ece7e2] font-mono truncate">
              {sourceUrl}
            </p>
          </div>
          {!isComplete && (
            <Loader2 className="h-5 w-5 text-[#e59a1d] animate-spin flex-shrink-0" strokeWidth={2} />
          )}
        </div>

        {/* Content area - fills remaining height, scrolls if needed */}
        <div className="flex-1 overflow-y-auto p-8">
          {isComplete && projectSummary ? (
            <div className="space-y-5">
              {projectSummary.name && (
                <div>
                  <p className="text-[12px] uppercase tracking-wider text-[#6d5235] mb-1.5">Project</p>
                  <p className="text-[20px] font-semibold text-[#ece7e2]">{projectSummary.name}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                {projectSummary.author && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-[#8b673f] flex-shrink-0" />
                    <div>
                      <p className="text-[12px] uppercase tracking-wider text-[#6d5235]">Author</p>
                      <p className="text-[15px] text-[#a47a52]">{projectSummary.author}</p>
                    </div>
                  </div>
                )}
                {projectSummary.date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-[#8b673f] flex-shrink-0" />
                    <div>
                      <p className="text-[12px] uppercase tracking-wider text-[#6d5235]">Last Updated</p>
                      <p className="text-[15px] text-[#a47a52]">{projectSummary.date}</p>
                    </div>
                  </div>
                )}
              </div>

              {projectSummary.language && (
                <div className="flex items-center gap-3">
                  <Tag className="h-5 w-5 text-[#8b673f] flex-shrink-0" />
                  <div>
                    <p className="text-[12px] uppercase tracking-wider text-[#6d5235]">Language</p>
                    <p className="text-[15px] text-[#a47a52]">{projectSummary.language}</p>
                  </div>
                </div>
              )}

              {projectSummary.description && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-[#8b673f]" />
                    <p className="text-[12px] uppercase tracking-wider text-[#6d5235]">Description</p>
                  </div>
                  <p className="text-[16px] leading-7 text-[#c9943e]">{projectSummary.description}</p>
                </div>
              )}

              {projectSummary.tags && projectSummary.tags.length > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-3">
                  {projectSummary.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-md bg-[#1c120a] border border-[#2a1a10] text-[13px] text-[#8b673f]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse pointer-events-none" style={{ animationDuration: '2s' }} />

              <div className="space-y-4">
                <div className="h-5 rounded-full bg-[#1c120a] w-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
                </div>
                <div className="h-5 rounded-full bg-[#1c120a] w-4/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
                </div>
                <div className="h-5 rounded-full bg-[#1c120a] w-3/4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.4s' }} />
                </div>
                <div className="h-5 rounded-full bg-[#1c120a] w-5/6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.6s' }} />
                </div>
              </div>

              <div className="pt-5 space-y-4">
                <div className="h-4 rounded-full bg-[#1c120a] w-2/3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.8s' }} />
                </div>
                <div className="h-4 rounded-full bg-[#1c120a] w-1/2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ animationDelay: '1s' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar - fixed at bottom, never moves */}
        <div className="px-8 pb-8 pt-2 border-t border-[#1c110a] flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[#8e7963]">Analysis</span>
            <span className={`text-[13px] font-mono ${isComplete ? 'text-[#1fc164]' : 'text-[#e59a1d]'}`}>{progress}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#2a1a10]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-[#1fc164] w-full' : 'bg-[#e59a1d]'}`}
              style={{ width: isComplete ? '100%' : `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right: Terminal-style AI agent output */}
      <div className="rounded-2xl border border-[#24170e] bg-[#110c09]/96 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.55)] flex flex-col max-h-[620px]">
        <div className="flex items-center gap-4 px-8 py-5 border-b border-[#24170e] flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#25180c] text-[#1fc164]">
            <Sparkles className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[14px] text-[#8e7963]">AI Agent</p>
            <p className="text-[16px] text-[#ece7e2]">
              {isComplete ? 'Analysis complete' : 'Analyzing your project...'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isComplete ? 'bg-[#1fc164]' : 'bg-[#e59a1d] animate-pulse'}`} />
            <span className={`text-[12px] font-mono ${isComplete ? 'text-[#1fc164]' : 'text-[#e59a1d]'}`}>
              {isComplete ? 'DONE' : 'RUNNING'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 [font-family:'JetBrains_Mono',ui-monospace,monospace]">
          <div className="space-y-2">
            {ANALYSIS_STEPS.map((step, index) => {
              const Icon = STEP_ICONS[index]
              const isActive = index === stepIndex
              const isDone = index < stepIndex
              const stepResult = stepResults?.[index]
              const hasResult = isComplete && stepResult !== undefined
              const isExpanded = expandedStep === index
              const hasFindings = hasResult && stepResult?.findings && stepResult.findings.length > 0

              return (
                <div
                  key={step.label}
                  className={`rounded-lg transition-all duration-300 ${
                    isActive ? 'bg-[#e59a1d]/10 border border-[#e59a1d]/20' :
                    isDone ? 'opacity-80' :
                    'opacity-30'
                  }`}
                >
                  <button
                    onClick={() => {
                      if (hasFindings) setExpandedStep(isExpanded ? null : index)
                    }}
                    className={`w-full flex items-start gap-4 py-3 px-4 text-left ${hasFindings ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 ${
                      hasResult && stepResult?.passed === false ? 'text-[#ef4444]' :
                      hasResult || isDone ? 'text-[#1fc164]' :
                      isActive ? 'text-[#e59a1d]' :
                      'text-[#5a4228]'
                    }`}>
                      {hasResult && stepResult?.passed === false ? (
                        <XCircle className="h-5 w-5" strokeWidth={2.5} />
                      ) : hasResult || isDone ? (
                        <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
                      ) : isActive ? (
                        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
                      ) : (
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-[14px] ${
                          hasResult && stepResult?.passed === false ? 'text-[#ef4444]' :
                          hasResult || isDone ? 'text-[#1fc164]' :
                          isActive ? 'text-[#e59a1d]' :
                          'text-[#5a4228]'
                        }`}>
                          {step.label}
                        </p>
                        {hasFindings && (
                          <ChevronDown className={`h-4 w-4 text-[#6d5235] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                      {isActive && !isComplete && (
                        <p className="text-[12px] text-[#8e7963] mt-1">
                          {step.detail}
                        </p>
                      )}
                      {hasResult && stepResult?.detail && (
                        <p className={`text-[12px] mt-1 ${
                          stepResult.passed ? 'text-[#6f9a84]' : 'text-[#c45a3a]'
                        }`}>
                          {stepResult.detail}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Expandable findings */}
                  {hasFindings && isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="bg-[#090605] rounded-lg border border-[#1c110a] p-4 space-y-2">
                        {stepResult.findings!.map((finding: string, i: number) => (
                          <div key={i} className={`flex items-start gap-3 py-2 ${i > 0 ? 'border-t border-[#1c110a]' : ''}`}>
                            <div className="mt-1 flex-shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#1fc164]" strokeWidth={2.5} />
                            </div>
                            <p className="text-[13px] leading-5 text-[#a47a52]">
                              {finding}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
