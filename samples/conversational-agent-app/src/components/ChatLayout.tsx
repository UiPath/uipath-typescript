/**
 * ChatLayout - Main layout component with sidebar and chat area
 */

import { useEffect } from 'react'
import { useConversationalAgent } from '../context/ConversationalAgentContext'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'

export function ChatLayout() {
  const { loadAgents, error, clearError } = useConversationalAgent()

  // Load agents on mount
  useEffect(() => {
    loadAgents()
  }, [])

  return (
    <div className="h-full flex bg-chat-bg">
      {/* Error toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="flex-1">{error}</span>
          <button
            onClick={clearError}
            className="text-white/80 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main chat area */}
      <ChatArea />
    </div>
  )
}
