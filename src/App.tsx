import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConnectPage } from './components/ConnectPage'
import { ChatPage } from './components/ChatPage'
import './App.css'

function App() {
  return (
    <BrowserRouter basename="/macrocoder-site">
      <Routes>
        <Route path="/connect/:projectId" element={<ConnectPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}

function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">MacroCoder</h1>
          <nav className="flex gap-6">
            <a href="/macrocoder-site/" className="text-gray-600 hover:text-gray-900">
              Home
            </a>
            <a href="#features" className="text-gray-600 hover:text-gray-900">
              Features
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900">
              Pricing
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">AI-Powered Code Analysis</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Connect your repository and get instant AI analysis of your codebase. Understand
              complexity, identify issues, and plan your next steps.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="/macrocoder-site/connect/demo-project"
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Try Demo
              </a>
              <a
                href="#learn-more"
                className="px-8 py-4 bg-white text-gray-700 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Features</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                title="Instant Analysis"
                description="Get immediate insights into your codebase structure, dependencies, and potential issues."
              />
              <FeatureCard
                title="AI-Powered Chat"
                description="Talk to Claude about your code. Ask questions, get recommendations, and plan improvements."
              />
              <FeatureCard
                title="Secure & Private"
                description="Your code is analyzed securely. We only request read-only access and never store your source code."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400">© 2024 MacroCoder. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 bg-gray-50 rounded-2xl">
      <h4 className="text-xl font-semibold text-gray-900 mb-3">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

export default App
