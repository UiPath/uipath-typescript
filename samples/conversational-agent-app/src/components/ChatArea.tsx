/**
 * ChatArea - Main chat interface composing message list and input
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useConversationalAgent } from '../context/ConversationalAgentContext'
import { MessageBubble } from './MessageBubble'
import { WelcomeScreen } from './WelcomeScreen'
import { ChatInput } from './ChatInput'
import { Spinner } from './Spinner'

export function ChatArea() {
  const {
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

  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
