/**
 * ChatArea - Main chat interface with messages and input
 */

import { useState, useRef, useEffect } from 'react'
import { useConversationalAgent } from '../context/ConversationalAgentContext'
import { MessageBubble } from './MessageBubble'

export function ChatArea() {
  const {
    messages,
    currentConversation,
    selectedAgent,
    isStreaming,
    sendMessage,
    createConversation
  } = useConversationalAgent()

  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  // Send pending message once conversation is created
  useEffect(() => {
    if (currentConversation && pendingMessage) {
      sendMessage(pendingMessage)
      setPendingMessage(null)
    }
  }, [currentConversation, pendingMessage])

  // Handle suggestion click - create conversation and send message
  const handleSuggestionClick = async (suggestion: string) => {
    if (!selectedAgent) return
    setPendingMessage(suggestion)
    await createConversation()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const hasText = input.trim().length > 0
    const hasAttachments = attachments.length > 0

    // Need either text or attachments to send
    if ((!hasText && !hasAttachments) || isStreaming) return

    // Capture values before clearing state
    const messageContent = input.trim()
    const filesToSend = [...attachments]

    // Clear input and attachments
    setInput('')
    setAttachments([])

    // Send message with captured attachments
    await sendMessage(messageContent, filesToSend)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Welcome screen when no conversation selected
  if (!currentConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-chat-bg">
        <div className="max-w-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-4">
            {selectedAgent ? `Chat with ${selectedAgent.name}` : 'Welcome to Conversational Agent'}
          </h2>
          <p className="text-gray-400 mb-6">
            {selectedAgent
              ? 'Start a new conversation to begin chatting with the agent.'
              : 'Select an agent from the sidebar to start a conversation.'}
          </p>
          {selectedAgent && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {['Tell me about yourself', 'What can you help me with?', 'Give me an example', 'How do I get started?'].map((suggestion) => (
                <button
                  key={suggestion}
                  className="p-4 bg-chat-input hover:bg-white/5 border border-white/10 rounded-lg text-left transition-colors disabled:opacity-50"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={!!pendingMessage}
                >
                  <p className="text-sm text-gray-300">{suggestion}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
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
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 p-4">
        <div className="max-w-3xl mx-auto">
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-chat-input px-3 py-1.5 rounded-lg text-sm"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-2 bg-chat-input rounded-xl border border-white/10 focus-within:border-white/20 transition-colors">
              {/* Attachment button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-400 hover:text-white transition-colors"
                title="Add attachment"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Text input */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-transparent py-3 pr-3 resize-none focus:outline-none max-h-[200px]"
                disabled={isStreaming}
              />

              {/* Send button */}
              <button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || isStreaming}
                className="p-3 text-accent hover:text-accent/80 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </form>

          <p className="text-xs text-gray-500 text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
