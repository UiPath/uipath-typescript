/**
 * ConversationalAgentContext - Central state management for the chat application
 */

import { createContext, useContext, useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import {
  ConversationalAgent,
  type AgentGetResponse,
  type ConversationGetResponse,
  type SessionEventHelper,
  type ExchangeGetResponse,
  type AttachmentUploadResponse,
  MessageRole,
  isInlineValue
} from '@uipath/uipath-typescript/conversational-agent'

// Types - Using SDK's MessageRole type for consistency
export interface ChatMessage {
  id: string
  role: MessageRole  // 'user' | 'assistant' | 'system' from SDK
  content: string
  timestamp: Date
  exchangeId?: string
  isStreaming?: boolean
  attachments?: string[]
}

interface ConversationalAgentContextValue {
  // Service
  conversationalAgentService: ConversationalAgent | null
  connectionStatus: string

  // Agents
  agents: AgentGetResponse[]
  selectedAgent: AgentGetResponse | null
  isLoadingAgents: boolean
  loadAgents: () => Promise<void>
  selectAgent: (agent: AgentGetResponse | null) => void

  // Conversations
  conversations: ConversationGetResponse[]
  currentConversation: ConversationGetResponse | null
  isLoadingConversations: boolean
  loadConversations: () => Promise<void>
  createConversation: () => Promise<void>
  selectConversation: (conv: ConversationGetResponse) => Promise<void>
  deleteConversation: (id: string) => Promise<void>

  // Chat
  messages: ChatMessage[]
  isStreaming: boolean
  sendMessage: (content: string, attachments?: File[]) => Promise<void>

  // Exchanges
  exchanges: ExchangeGetResponse[]
  loadExchanges: () => Promise<void>

  // UI
  error: string | null
  clearError: () => void
}

const ConversationalAgentContext = createContext<ConversationalAgentContextValue | null>(null)

export function ConversationalAgentProvider({ children }: { children: ReactNode }) {
  const { uipathSDK } = useAuth()

  // Service instance
  const conversationalAgentService = useMemo(() => {
    if (!uipathSDK) return null
    return new ConversationalAgent(uipathSDK)
  }, [uipathSDK])

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState('Disconnected')

  // Agent state
  const [agents, setAgents] = useState<AgentGetResponse[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentGetResponse | null>(null)
  const [isLoadingAgents, setIsLoadingAgents] = useState(false)

  // Conversation state
  const [conversations, setConversations] = useState<ConversationGetResponse[]>([])
  const [currentConversation, setCurrentConversation] = useState<ConversationGetResponse | null>(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const sessionEventHelperRef = useRef<SessionEventHelper | null>(null)

  // Exchange state
  const [exchanges, setExchanges] = useState<ExchangeGetResponse[]>([])

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Initialize service event handlers
  useEffect(() => {
    if (!conversationalAgentService) return

    const cleanup = conversationalAgentService.conversations.onConnectionStatusChanged((status: string, err: Error | null) => {
      setConnectionStatus(status)
      if (err) setError(err.message)
    })

    return () => {
      cleanup()
      conversationalAgentService.conversations.disconnect()
    }
  }, [conversationalAgentService])

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (sessionEventHelperRef.current) {
        sessionEventHelperRef.current.sendSessionEnd()
      }
    }
  }, [])

  // Load agents
  const loadAgents = async () => {
    if (!conversationalAgentService) return
    setIsLoadingAgents(true)
    setError(null)

    try {
      const agentList = await conversationalAgentService.getAll()
      setAgents(agentList)
      console.log('[Agents] Loaded:', agentList.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setIsLoadingAgents(false)
    }
  }

  // Select agent
  const selectAgent = (agent: AgentGetResponse | null) => {
    setSelectedAgent(agent)
    // Clear conversation when agent changes
    if (agent?.id !== selectedAgent?.id) {
      endSession()
      setCurrentConversation(null)
      setMessages([])
    }
  }

  // Load conversations
  const loadConversations = async () => {
    if (!conversationalAgentService) return
    setIsLoadingConversations(true)
    setError(null)

    try {
      const response = await conversationalAgentService.conversations.getAll({ pageSize: 20 })
      setConversations(response.items)
      console.log('[Conversations] Loaded:', response.items.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setIsLoadingConversations(false)
    }
  }

  // Create conversation
  const createConversation = async () => {
    if (!conversationalAgentService || !selectedAgent) {
      setError('Please select an agent first')
      return
    }
    setError(null)

    try {
      endSession()

      const response = await conversationalAgentService.conversations.create({
        agentReleaseId: selectedAgent.id,
        folderId: selectedAgent.folderId,
        autogenerateLabel: true
      })

      setCurrentConversation(response)
      setMessages([])
      setConversations(prev => [response, ...prev])
      console.log('[Conversation] Created:', response.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation')
    }
  }

  // Select conversation
  const selectConversation = async (conv: ConversationGetResponse) => {
    if (conv.id === currentConversation?.id) return

    endSession()
    setCurrentConversation(conv)
    setMessages([])

    // Load exchange history
    if (conversationalAgentService) {
      try {
        const response = await conversationalAgentService.conversations.exchanges.getAll(conv.id, { pageSize: 50 })
        // Convert exchanges to messages using SDK types
        const msgs: ChatMessage[] = []
        for (const exchange of response.items.reverse()) {
          for (const message of exchange.messages || []) {
            const contentPartData = message.contentParts?.[0]?.data
            // Use SDK's isInlineValue helper for type-safe content extraction
            const textContent = isInlineValue(contentPartData) ? contentPartData.inline : ''
            if (textContent) {
              msgs.push({
                id: message.messageId,
                role: message.role as MessageRole,
                content: textContent,
                timestamp: new Date(message.createdTime || Date.now()),
                exchangeId: exchange.exchangeId
              })
            }
          }
        }
        setMessages(msgs)
      } catch (err) {
        console.error('[Conversation] Failed to load history:', err)
      }
    }
  }

  // Delete conversation
  const deleteConversation = async (id: string) => {
    if (!conversationalAgentService) return
    setError(null)

    try {
      await conversationalAgentService.conversations.deleteById(id)
      setConversations(prev => prev.filter(c => c.id !== id))

      if (currentConversation?.id === id) {
        endSession()
        setCurrentConversation(null)
        setMessages([])
      }
      console.log('[Conversation] Deleted:', id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation')
    }
  }

  // End session helper
  const endSession = () => {
    if (sessionEventHelperRef.current) {
      sessionEventHelperRef.current.sendSessionEnd()
      sessionEventHelperRef.current = null
    }
  }

  // Send message
  const sendMessage = async (content: string, attachments?: File[]) => {
    const hasContent = content.trim().length > 0
    const hasAttachments = attachments && attachments.length > 0

    // Need either content or attachments
    if (!conversationalAgentService || !currentConversation || (!hasContent && !hasAttachments)) return
    setError(null)

    // Upload attachments first if any
    let uploadedAttachments: AttachmentUploadResponse[] = []
    if (attachments && attachments.length > 0) {
      try {
        console.log('[Attachments] Uploading', attachments.length, 'files')
        uploadedAttachments = await Promise.all(
          attachments.map(file =>
            conversationalAgentService.conversations.attachments.upload(currentConversation.id, file)
          )
        )
        console.log('[Attachments] Uploaded:', uploadedAttachments.map(a => a.name))
      } catch (err) {
        console.error('[Attachments] Upload failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to upload attachments')
        return
      }
    }

    // Add user message using SDK's MessageRole enum
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: MessageRole.User,
      content: content.trim(),
      timestamp: new Date(),
      attachments: uploadedAttachments.map(a => a.name)
    }
    setMessages(prev => [...prev, userMessage])

    // Add placeholder for assistant response
    const assistantId = `assistant-${Date.now()}`
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: MessageRole.Assistant,
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }
    setMessages(prev => [...prev, assistantMessage])
    setIsStreaming(true)

    try {
      // Create or use existing session
      if (!sessionEventHelperRef.current) {
        const sessionEventHelper = conversationalAgentService.conversations.startSession({
          conversationId: currentConversation.id
        })

        sessionEventHelper.onSessionStarted(() => {
          console.log('[Session] Started')
          sessionEventHelperRef.current = sessionEventHelper
          startExchange(content, assistantId, uploadedAttachments)
        })

        sessionEventHelper.onSessionEnd(() => {
          console.log('[Session] Ended')
          sessionEventHelperRef.current = null
          setIsStreaming(false)
        })

        sessionEventHelper.onErrorStart((err) => {
          console.error('[Session] Error:', err)
          setError(err.message || 'Session error')
          setIsStreaming(false)
        })
      } else {
        startExchange(content, assistantId, uploadedAttachments)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setIsStreaming(false)
    }
  }

  // Start exchange helper
  const startExchange = async (content: string, assistantMessageId: string, attachments: AttachmentUploadResponse[] = []) => {
    if (!sessionEventHelperRef.current) return

    const exchangeEventHelper = sessionEventHelperRef.current.startExchange()
    let fullContent = ''

    exchangeEventHelper.onMessageStart((messageEventHelper) => {
      if (messageEventHelper.startEvent.role === MessageRole.Assistant) {
        messageEventHelper.onContentPartStart((contentPartEventHelper) => {
          if (contentPartEventHelper.startEvent.mimeType.startsWith('text/')) {
            contentPartEventHelper.onChunk((chunk) => {
              fullContent += chunk.data || ''
              setMessages(prev => prev.map(m =>
                m.id === assistantMessageId
                  ? { ...m, content: fullContent }
                  : m
              ))
            })

            contentPartEventHelper.onContentPartEnd(() => {
              setMessages(prev => prev.map(m =>
                m.id === assistantMessageId
                  ? { ...m, content: fullContent, isStreaming: false, exchangeId: exchangeEventHelper.exchangeId }
                  : m
              ))
            })
          }
        })
      }
    })

    exchangeEventHelper.onExchangeEnd(() => {
      setIsStreaming(false)
      console.log('[Exchange] Ended:', exchangeEventHelper.exchangeId)
    })

    exchangeEventHelper.onErrorStart((err) => {
      setError(err.message || 'Exchange error')
      setIsStreaming(false)
    })

    // Send user message
    const messageEventHelper = exchangeEventHelper.startMessage({ role: MessageRole.User })

    // Send text content part if there's text
    if (content.trim()) {
      await messageEventHelper.sendContentPart({ data: content })
    }

    // Send attachment content parts with external URIs
    for (const attachment of attachments) {
      messageEventHelper.startContentPart({
        mimeType: attachment.mimeType,
        externalValue: { uri: attachment.uri }
      }).sendContentPartEnd()
      console.log('[Attachment] Sent:', attachment.name, attachment.uri)
    }

    // End the message
    messageEventHelper.sendMessageEnd()
  }

  // Load exchanges
  const loadExchanges = async () => {
    if (!conversationalAgentService || !currentConversation) return

    try {
      const response = await conversationalAgentService.conversations.exchanges.getAll(currentConversation.id, { pageSize: 20 })
      setExchanges(response.items)
    } catch (err) {
      console.error('[Exchanges] Failed to load:', err)
    }
  }

  const clearError = () => setError(null)

  const value: ConversationalAgentContextValue = {
    conversationalAgentService,
    connectionStatus,
    agents,
    selectedAgent,
    isLoadingAgents,
    loadAgents,
    selectAgent,
    conversations,
    currentConversation,
    isLoadingConversations,
    loadConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    messages,
    isStreaming,
    sendMessage,
    exchanges,
    loadExchanges,
    error,
    clearError
  }

  return (
    <ConversationalAgentContext.Provider value={value}>
      {children}
    </ConversationalAgentContext.Provider>
  )
}

export function useConversationalAgent() {
  const context = useContext(ConversationalAgentContext)
  if (!context) {
    throw new Error('useConversationalAgent must be used within ConversationalAgentProvider')
  }
  return context
}
