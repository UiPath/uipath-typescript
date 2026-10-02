/**
 * ChatArea - Main chat interface composing message list and input
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useConversationalAgent } from '../context/ConversationalAgentContext'
import type { AvailableConnectionsResponse } from '@uipath/uipath-typescript/conversational-agent'
import { MessageBubble } from './MessageBubble'
import { WelcomeScreen } from './WelcomeScreen'
import { ChatInput } from './ChatInput'
import { ConnectionReadinessCard, type ConnectorReadiness } from './ConnectionReadinessCard'
import { Spinner } from './Spinner'

export function ChatArea() {
  const {
    conversationalAgent,
    messages,
    currentConversation,
    selectedAgent,
    isStreaming,
    sendMessage,
    createConversation,
    exchangesHasMore,
    loadMoreExchanges,
    submitFeedback,
    resolveInterrupt,
  } = useConversationalAgent()

  const [connectionReadiness, setConnectionReadiness] = useState<ConnectorReadiness[] | null>(null)

  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch connection readiness when agent changes
  useEffect(() => {
    if (!conversationalAgent || !selectedAgent) {
      setConnectionReadiness(null)
      return
    }
    let cancelled = false

    const mapItems = (items: AvailableConnectionsResponse) => {
      if (cancelled) return
      if (items.length === 0) { setConnectionReadiness(null); return }
      const readiness: ConnectorReadiness[] = items.map(item => ({
        connectorKey: item.connectorKey,
        connectorName: item.connectorName ?? item.connectorKey,
        connectorImage: item.connectorImage,
        isConfigurable: item.isConfigurable !== false,
        currentConnectionId: item.currentConnectionId,
        currentConnectionName: item.currentConnectionName,
        currentConnectionState: (item.connections?.find(c => c.id === item.currentConnectionId)?.state as ConnectorReadiness['currentConnectionState'])
          ?? (item.currentConnectionId ? 'Expired' : undefined),
        connectionsUrl: item.connectionsUrl,
      }))
      const hasUnresolved = readiness.some(
        c => c.isConfigurable && (!c.currentConnectionId || c.currentConnectionState !== 'Enabled'),
      )
      setConnectionReadiness(hasUnresolved ? readiness : null)
    }

    // Initial fetch, then sequential re-fetch after delay to pick up auto-bind results
    let timerRef: ReturnType<typeof setTimeout> | undefined
    conversationalAgent
      .getAvailableConnections(selectedAgent.id, selectedAgent.folderId)
      .then((items) => {
        mapItems(items)
        if (cancelled) return
        return new Promise<void>((resolve) => {
          timerRef = setTimeout(resolve, 1500)
        })
      })
      .then(() => {
        if (cancelled) return
        return conversationalAgent
          .getAvailableConnections(selectedAgent.id, selectedAgent.folderId)
          .then(mapItems)
      })
      .catch((error) => {
        console.warn('Failed to fetch connection readiness:', error)
        if (!cancelled) setConnectionReadiness(null)
      })

    return () => { cancelled = true; if (timerRef) clearTimeout(timerRef) }
  }, [conversationalAgent, selectedAgent])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send pending message once conversation is created
  useEffect(() => {
    if (currentConversation && pendingMessage) {
      sendMessage(pendingMessage)
      setPendingMessage(null)
    }
  }, [currentConversation, pendingMessage, sendMessage])

  const handleSuggestionClick = useCallback(async (suggestion: string) => {
    if (!selectedAgent) return
    setPendingMessage(suggestion)
    await createConversation()
  }, [selectedAgent, createConversation])

  const handleSubmit = useCallback(async (content: string, attachments: File[]) => {
    setConnectionReadiness(null)
    await sendMessage(content, attachments)
  }, [sendMessage])

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true)
    try {
      await loadMoreExchanges()
    } finally {
      setIsLoadingMore(false)
    }
  }, [loadMoreExchanges])

  // Welcome screen when no conversation selected
  if (!currentConversation) {
    return (
      <WelcomeScreen
        selectedAgent={selectedAgent}
        onSuggestionClick={handleSuggestionClick}
        disabled={!!pendingMessage}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-chat-bg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="font-medium">{currentConversation.label || 'New Chat'}</h2>
          <p className="text-sm text-gray-500">
            {selectedAgent?.name || 'Agent'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="text-sm text-accent flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              Generating...
            </span>
          )}
        </div>
      </div>

      {/* Connection readiness card */}
      {connectionReadiness && conversationalAgent && selectedAgent && (
        <ConnectionReadinessCard
          connectors={connectionReadiness}
          conversationalAgent={conversationalAgent}
          agentId={selectedAgent.id}
          folderId={selectedAgent.folderId}
          onAllConnected={() => setConnectionReadiness(null)}
          defaultCollapsed={messages.length > 0}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-6">
            {/* Load older messages */}
            {exchangesHasMore && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="w-4 h-4 border-gray-400" />
                      Loading...
                    </span>
                  ) : (
                    'Load older messages'
                  )}
                </button>
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onFeedback={submitFeedback}
                onResolveInterrupt={resolveInterrupt}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        onSubmit={handleSubmit}
        isStreaming={isStreaming}
      />
    </div>
  )
}
