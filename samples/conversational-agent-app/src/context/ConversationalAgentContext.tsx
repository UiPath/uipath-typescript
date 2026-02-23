/**
 * ConversationalAgentContext - Orchestration layer that composes custom hooks
 */

import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import {
  ConversationalAgent,
  Exchanges,
  type AgentGetResponse,
  type ConversationGetResponse,
} from '@uipath/uipath-typescript/conversational-agent'
import { useAgents } from '../hooks/useAgents'
import { useConversations } from '../hooks/useConversations'
import { useChat } from '../hooks/useChat'
import type { ChatMessage } from '../types'

// Re-export types so consumers can import from context (backward compat)
export type { ChatMessage, ToolCallInfo, InterruptInfo, CitationInfo } from '../types'

// ─── Context value interface ───

interface ConversationalAgentContextValue {
  connectionStatus: string

  agents: AgentGetResponse[]
  selectedAgent: AgentGetResponse | null
  isLoadingAgents: boolean
  loadAgents: () => Promise<void>
  selectAgent: (agent: AgentGetResponse | null) => void

  conversations: ConversationGetResponse[]
  currentConversation: ConversationGetResponse | null
  isLoadingConversations: boolean
  conversationsHasMore: boolean
  loadConversations: () => Promise<void>
  loadMoreConversations: () => Promise<void>
  createConversation: () => Promise<void>
  selectConversation: (conversation: ConversationGetResponse) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, newLabel: string) => Promise<void>

  messages: ChatMessage[]
  isStreaming: boolean
  sendMessage: (content: string, attachments?: File[]) => Promise<void>

  exchangesHasMore: boolean
  loadMoreExchanges: () => Promise<void>

  submitFeedback: (messageId: string, rating: 'positive' | 'negative') => Promise<void>
  resolveInterrupt: (messageId: string, approved: boolean) => Promise<void>

  error: string | null
  clearError: () => void
}

const ConversationalAgentContext = createContext<ConversationalAgentContextValue | null>(null)

// ─── Provider ───

export function ConversationalAgentProvider({ children }: { children: ReactNode }) {
  const { uipathSDK } = useAuth()

  // SDK services (stable unless SDK changes)
  const conversationalAgent = useMemo(() => uipathSDK ? new ConversationalAgent(uipathSDK) : null, [uipathSDK])
  const exchanges = useMemo(() => uipathSDK ? new Exchanges(uipathSDK) : null, [uipathSDK])

  // Shared error state
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState('Disconnected')

  useEffect(() => {
    if (!conversationalAgent) return
    const cleanup = conversationalAgent.onConnectionStatusChanged((status: string, err: Error | null) => {
      setConnectionStatus(status)
      if (err) setError(err.message)
    })
    return cleanup
  }, [conversationalAgent])

  // ─── Compose hooks ───

  const {
    agents, selectedAgent, isLoading: isLoadingAgents,
    loadAgents, selectAgent: setSelectedAgent
  } = useAgents(conversationalAgent, setError)

  const {
    conversations, currentConversation, isLoading: isLoadingConversations,
    hasMore: conversationsHasMore,
    load: loadConversations, loadMore: loadMoreConversations,
    addToFront, setCurrentConversation, updateLabel,
    deleteConversation: conversationDelete, renameConversation: conversationRename
  } = useConversations(conversationalAgent, setError)

  // Label update handler — refs are needed here because useChat is called
  // before currentConversationRef is assigned, so we define the callback
  // using updateLabel which only needs the conversation ID.
  const currentConversationIdRef = useRef<string | null>(null)

  const handleLabelUpdate = useCallback((label: string) => {
    const conversationId = currentConversationIdRef.current
    if (conversationId) updateLabel(conversationId, label)
  }, [updateLabel])

  const {
    messages, isStreaming, exchangesHasMore,
    setConversation: setChatConversation,
    sendMessage, loadHistory, loadMoreExchanges,
    submitFeedback, resolveInterrupt,
    endSession: endChatSession, clearMessages,
  } = useChat(exchanges, setError, handleLabelUpdate)

  // ─── Refs for stable orchestration callbacks ───

  const selectedAgentRef = useRef(selectedAgent)
  selectedAgentRef.current = selectedAgent

  const currentConversationRef = useRef(currentConversation)
  currentConversationRef.current = currentConversation
  currentConversationIdRef.current = currentConversation?.id ?? null

  // ─── Orchestration: composed actions ───

  const endSession = useCallback(() => {
    endChatSession()
  }, [endChatSession])

  const selectAgent = useCallback((agent: AgentGetResponse | null) => {
    if (agent?.id === selectedAgentRef.current?.id) return
    setSelectedAgent(agent)
    endSession()
    setCurrentConversation(null)
    setChatConversation(null)
    clearMessages()
  }, [setSelectedAgent, endSession, setCurrentConversation, setChatConversation, clearMessages])

  const selectConversation = useCallback(async (conversation: ConversationGetResponse) => {
    if (conversation.id === currentConversationRef.current?.id) return
    endSession()
    setCurrentConversation(conversation)
    setChatConversation(conversation)
    clearMessages()
    await loadHistory(conversation.id)
  }, [endSession, setCurrentConversation, setChatConversation, clearMessages, loadHistory])

  const createConversation = useCallback(async () => {
    const agent = selectedAgentRef.current
    if (!agent) {
      setError('Please select an agent first')
      return
    }
    setError(null)

    try {
      endSession()
      const conversation = await agent.conversations.create({ autogenerateLabel: true })
      setCurrentConversation(conversation)
      setChatConversation(conversation)
      addToFront(conversation)
      clearMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation')
    }
  }, [endSession, setCurrentConversation, setChatConversation, addToFront, clearMessages, setError])

  const deleteConversation = useCallback(async (id: string) => {
    const wasCurrent = currentConversationRef.current?.id === id
    const success = await conversationDelete(id)
    if (success && wasCurrent) {
      endSession()
      setCurrentConversation(null)
      setChatConversation(null)
      clearMessages()
    }
  }, [conversationDelete, endSession, setCurrentConversation, setChatConversation, clearMessages])

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      endChatSession()
    }
  }, [endChatSession])

  // ─── Memoized context value ───

  const value = useMemo<ConversationalAgentContextValue>(() => ({
    connectionStatus,
    agents,
    selectedAgent,
    isLoadingAgents,
    loadAgents,
    selectAgent,
    conversations,
    currentConversation,
    isLoadingConversations,
    conversationsHasMore,
    loadConversations,
    loadMoreConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation: conversationRename,
    messages,
    isStreaming,
    sendMessage,
    exchangesHasMore,
    loadMoreExchanges,
    submitFeedback,
    resolveInterrupt,
    error,
    clearError,
  }), [
    connectionStatus, agents, selectedAgent, isLoadingAgents, loadAgents, selectAgent,
    conversations, currentConversation, isLoadingConversations, conversationsHasMore,
    loadConversations, loadMoreConversations, createConversation, selectConversation,
    deleteConversation, conversationRename,
    messages, isStreaming, sendMessage, exchangesHasMore, loadMoreExchanges,
    submitFeedback, resolveInterrupt,
    error, clearError,
  ])

  return (
    <ConversationalAgentContext.Provider value={value}>
      {children}
    </ConversationalAgentContext.Provider>
  )
}

// ─── Hook ───

export function useConversationalAgent() {
  const context = useContext(ConversationalAgentContext)
  if (!context) {
    throw new Error('useConversationalAgent must be used within ConversationalAgentProvider')
  }
  return context
}
