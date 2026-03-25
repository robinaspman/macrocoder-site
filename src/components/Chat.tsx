import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { saveConversation } from '../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatProps {
  projectId: string
  token: string
  snapshot: any
  workerUrl: string
}

export function Chat({ projectId, token, snapshot, workerUrl }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm MacroCoder's pre-sales analyst. I've analyzed your project and I'm here to help you scope out your needs.

I can see your codebase structure. Let me ask you a few questions to understand what you're looking for:

1. What are your main goals for this project?
2. What's your timeline?
3. Do you have a budget in mind?

Feel free to share as much or as little as you'd like!`
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || isLoading) return

    const userMsg: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(`${workerUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          token,
          snapshot,
          messages: [...messages, userMsg]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      // Add placeholder for assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      // Stream the response
      let assistantContent = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        assistantContent += chunk

        // Update the last message (assistant's response)
        setMessages((prev) => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: assistantContent
          }
          return newMessages
        })
      }

      // Save conversation after successful completion
      const currentMessages = [
        ...messages,
        userMsg,
        { role: 'assistant' as const, content: assistantContent }
      ]
      try {
        await saveConversation(projectId, token, snapshot, currentMessages)
      } catch (saveError) {
        console.error('Failed to save conversation:', saveError)
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">MacroCoder Analyst</h1>
            <p className="text-sm text-gray-500">Project: {projectId}</p>
          </div>
        </div>
        <a href="/macrocoder-site/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to home
        </a>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' ? 'bg-gray-200' : 'bg-blue-600'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-5 h-5 text-gray-600" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border shadow-sm text-gray-800'
              }`}
            >
              {message.role === 'user' ? (
                message.content
              ) : (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white border shadow-sm rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[60px] max-h-[150px]"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">Powered by Claude via MacroCoder</p>
      </div>
    </div>
  )
}
