/**
 * Sidebar - Conversation history and agent selection
 */

import { useState } from 'react'
import { useConversationalAgent } from '../context/ConversationalAgentContext'
import { AgentSelector } from './AgentSelector'

export function Sidebar() {
  const {
    conversations,
    currentConversation,
    isLoadingConversations,
    loadConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    selectedAgent,
    connectionStatus
  } = useConversationalAgent()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingId(id)
    await deleteConversation(id)
    setDeletingId(null)
  }

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return d.toLocaleDateString()
  }

  if (isCollapsed) {
    return (
      <div className="w-16 bg-chat-sidebar border-r border-white/10 flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={createConversation}
          disabled={!selectedAgent}
          className="mt-4 p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          title="New chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="w-64 bg-chat-sidebar border-r border-white/10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Conversations</h1>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="Collapse sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Agent selector */}
        <AgentSelector />

        {/* New chat button */}
        <button
          onClick={createConversation}
          disabled={!selectedAgent}
          className="w-full mt-3 px-4 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingConversations ? (
          <div className="p-4 text-center text-gray-400">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="mb-2">No conversations yet</p>
            <p className="text-sm">Select an agent and start a new chat</p>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`group p-3 rounded-lg cursor-pointer mb-1 transition-colors ${
                  currentConversation?.id === conv.id
                    ? 'bg-white/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.label || 'Untitled Chat'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(conv.createdTime)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    disabled={deletingId === conv.id}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                    title="Delete conversation"
                  >
                    {deletingId === conv.id ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection status */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'Connected' ? 'bg-green-500' :
            connectionStatus === 'Connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-gray-500'
          }`} />
          <span>{connectionStatus}</span>
        </div>
        <button
          onClick={loadConversations}
          disabled={isLoadingConversations}
          className="mt-2 text-xs text-gray-500 hover:text-gray-400"
        >
          Refresh conversations
        </button>
      </div>
    </div>
  )
}
