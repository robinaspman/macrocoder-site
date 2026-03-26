import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Github, Loader2, Check, AlertCircle, ArrowRight } from 'lucide-react'
import { startGitHubAuth, handleGitHubCallback, fetchRepoSnapshot } from '../lib/github'
import { getWorkerUrl } from '../lib/api'
import type { RepoSnapshot } from '../lib/github'

type Step = 'connect' | 'analyzing' | 'chat'

export function ConnectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('connect')
  const [error, setError] = useState<string | null>(null)
  const [, setSnapshot] = useState<RepoSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [workerUrl, setWorkerUrl] = useState('')

  useEffect(() => {
    getWorkerUrl().then(setWorkerUrl)
  }, [])

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (code && state && projectId && workerUrl) {
      handleOAuthCallback(code, state)
    }
  }, [searchParams, projectId, workerUrl])

  async function handleOAuthCallback(code: string, state: string) {
    setIsLoading(true)
    setStep('analyzing')

    try {
      if (!projectId) {
        throw new Error('Missing project identifier')
      }

      // Exchange code for token
      const { token } = await handleGitHubCallback(code, state, workerUrl)

      // Parse owner/repo from project ID (format: owner-repo or owner/repo)
      const parsed = projectId.includes('/') ? projectId.split('/') : projectId.split('-')
      const [owner, repo] = parsed
      if (!owner || !repo) {
        throw new Error('Invalid project identifier format')
      }

      // Fetch repo snapshot
      const repoSnapshot = await fetchRepoSnapshot(token, owner, repo)
      setSnapshot(repoSnapshot)

      // Navigate to chat
      navigate(`/macrocoder-site/chat?project=${projectId}`, {
        state: { snapshot: repoSnapshot }
      })
    } catch (err) {
      console.error('OAuth error:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect to GitHub')
      setStep('connect')
    } finally {
      setIsLoading(false)
    }
  }

  function handleConnect() {
    if (!projectId) return
    setIsLoading(true)
    startGitHubAuth(projectId)
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">Invalid Project ID</h1>
          <p className="text-gray-600 mt-2">Please check your link and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <a href="/macrocoder-site/" className="text-xl font-bold text-gray-900">
            MacroCoder
          </a>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center gap-4">
            <div
              className={`flex items-center gap-2 ${step === 'connect' ? 'text-blue-600' : 'text-green-600'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'connect' ? 'bg-blue-100' : 'bg-green-100'
                }`}
              >
                {step === 'connect' ? '1' : <Check className="w-5 h-5" />}
              </div>
              <span className="font-medium">Connect</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300" />
            <div
              className={`flex items-center gap-2 ${step === 'analyzing' ? 'text-blue-600' : step === 'chat' ? 'text-green-600' : 'text-gray-400'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'analyzing'
                    ? 'bg-blue-100'
                    : step === 'chat'
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                }`}
              >
                {step === 'chat' ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <span className="font-medium">Analyze</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300" />
            <div
              className={`flex items-center gap-2 ${step === 'chat' ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'chat' ? 'bg-blue-100' : 'bg-gray-100'
                }`}
              >
                3
              </div>
              <span className="font-medium">Chat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        {step === 'connect' && (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Github className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Connect Your Repository</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Link your GitHub repository <strong>{projectId}</strong> so our AI analyst can review
              your codebase and help scope your project.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="w-full max-w-sm mx-auto px-6 py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Github className="w-5 h-5" />
                  Connect with GitHub
                </>
              )}
            </button>

            <p className="mt-6 text-sm text-gray-500">
              We'll request read-only access to your repository.
              <br />
              You can revoke access at any time in your GitHub settings.
            </p>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Analyzing Your Codebase</h1>
            <p className="text-gray-600">
              We're fetching your repository structure, dependencies, and key files. This will only
              take a moment...
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
