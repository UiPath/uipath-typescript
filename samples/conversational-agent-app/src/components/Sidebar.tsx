/**
 * Sidebar - Conversation history and agent selection
 */

import { memo, useState, useCallback } from 'react'
import type { ConversationGetResponse } from '@uipath/uipath-typescript/conversational-agent'
import { useConversationalAgent } from '../context/ConversationalAgentContext'
import { AgentSelector } from './AgentSelector'
import { Spinner } from './Spinner'

export function Sidebar() {
  const {
    conversations,
    currentConversation,
    isLoadingConversations,
    conversationsHasMore,
    loadConversations,
    loadMoreConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    selectedAgent,
    connectionStatus
  } = useConversationalAgent()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await deleteConversation(id)
    } finally {
      setDeletingId(null)
    }
  }, [deleteConversation])

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
        {isLoadingConversations && conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <Spinner className="w-5 h-5 border-accent mx-auto mb-2" />
            Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="mb-2">No conversations yet</p>
            <p className="text-sm">Select an agent and start a new chat</p>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={currentConversation?.id === conversation.id}
                isDeleting={deletingId === conversation.id}
                onSelect={() => selectConversation(conversation)}
                onDelete={(e) => handleDelete(e, conversation.id)}
                onRename={(newLabel) => renameConversation(conversation.id, newLabel)}
              />
            ))}
            {/* Load more conversations */}
            {conversationsHasMore && (
              <button
                onClick={loadMoreConversations}
                disabled={isLoadingConversations}
                className="w-full mt-1 p-2 text-xs text-gray-500 hover:text-gray-400 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoadingConversations ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="w-3 h-3 border-gray-400" />
                    Loading...
                  </span>
                ) : (
                  'Load more conversations'
                )}
              </button>
            )}
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

// ─── ConversationItem sub-component (memoized) ───

interface ConversationItemProps {
  conversation: ConversationGetResponse
  isActive: boolean
  isDeleting: boolean
  onSelect: () => void
  onDelete: (e: React.MouseEvent) => void
  onRename: (newLabel: string) => void
}

const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  isDeleting,
  onSelect,
  onDelete,
  onRename
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(conversation.label || '')
    setIsEditing(true)
  }, [conversation.label])

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== conversation.label) {
      onRename(trimmed)
    }
    setIsEditing(false)
  }, [editValue, conversation.label, onRename])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }, [commitRename])

  return (
    <div
      onClick={onSelect}
      className={`group p-3 rounded-lg cursor-pointer mb-1 transition-colors ${
        isActive ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full text-sm font-medium bg-white/10 border border-white/20 rounded px-1.5 py-0.5 focus:outline-none focus:border-accent"
            />
          ) : (
            <p className="text-sm font-medium truncate">
              {conversation.label || 'Untitled Chat'}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {formatDate(conversation.createdTime)}
          </p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
          {/* Rename button */}
          {!isEditing && (
            <button
              onClick={startEditing}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Rename conversation"
            >
              <svg className="w-3.5 h-3.5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {/* Delete button */}
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Delete conversation"
          >
            {isDeleting ? (
              <Spinner className="w-3.5 h-3.5 border-gray-400" />
            ) : (
              <svg className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
})

// ─── Utilities ───

function formatDate(date: string | Date | undefined) {
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
