import type { RepoSnapshot } from './github'

// API configuration
const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://macrocoder-worker.your.workers.dev'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  projectId: string
  token: string
  snapshot: RepoSnapshot
  messages: ChatMessage[]
}

export async function sendChatMessage(request: ChatRequest): Promise<Response> {
  return fetch(`${WORKER_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })
}

export async function saveConversation(
  projectId: string,
  token: string,
  snapshot: RepoSnapshot,
  conversation: ChatMessage[]
): Promise<void> {
  const response = await fetch(`${WORKER_URL}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      projectId,
      token,
      snapshot,
      conversation,
      timestamp: new Date().toISOString()
    })
  })

  if (!response.ok) {
    throw new Error('Failed to save conversation')
  }
}

export async function getWorkerUrl(): Promise<string> {
  return WORKER_URL
}

export async function getConversation(
  projectId: string
): Promise<{ conversation: ChatMessage[]; snapshot: RepoSnapshot } | null> {
  try {
    const response = await fetch(`${WORKER_URL}/conversations/${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch conversation')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return null
  }
}
