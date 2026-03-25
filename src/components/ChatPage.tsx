import { useLocation, useSearchParams } from 'react-router-dom'
import { Chat } from './Chat'
import { getWorkerUrl, getConversation } from '../lib/api'
import { useEffect, useState } from 'react'

export function ChatPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const projectId = searchParams.get('project') || 'unknown'
  const token = searchParams.get('token') || ''
  const [snapshot, setSnapshot] = useState(location.state?.snapshot)
  const [workerUrl, setWorkerUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getWorkerUrl().then(setWorkerUrl)

    // If no snapshot in state, try to load from KV
    if (!snapshot) {
      getConversation(projectId).then((data) => {
        if (data?.snapshot) {
          setSnapshot(data.snapshot)
        }
        setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">No Snapshot Found</h1>
          <p className="text-gray-600 mt-2">Please connect your repository first.</p>
          <a
            href={`/macrocoder-site/connect/${projectId}`}
            className="mt-4 inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
          >
            Connect Repository
          </a>
        </div>
      </div>
    )
  }

  if (!workerUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return <Chat projectId={projectId} token={token} snapshot={snapshot} workerUrl={workerUrl} />
}
