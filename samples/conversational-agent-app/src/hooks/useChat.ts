/**
 * useChat - Manages messages, streaming, exchanges, feedback, and interrupts
 *
 * Uses echo: true so that session.onExchangeStart() fires for ALL exchanges,
 * providing a single code path for handling responses.
 */

import { useState, useRef, useCallback } from 'react'
import {
  type ConversationGetResponse,
  type ExchangeGetResponse,
  type SessionStream,
  type MessageStream,
  type ConversationAttachmentUploadResponse,
  type CompletedContentPart,
  type Exchanges,
  MessageRole,
  FeedbackRating,
  InterruptType,
  LogLevel,
  isInlineValue,
  isCitationSourceUrl,
  isCitationSourceMedia
} from '@uipath/uipath-typescript/conversational-agent'
import type { ChatMessage, ToolCallInfo, CitationInfo, InterruptInfo } from '../types'

// ─── Types for the module-level helper ───

type SetMessagesFn = (fn: (prev: ChatMessage[]) => ChatMessage[]) => void
type PendingInterruptMap = Map<string, { message: MessageStream; interruptId: string }>

// ─── State update helpers (reduce callback nesting) ───

function updateMessage(
  setMessages: SetMessagesFn,
  id: string,
  updates: Partial<ChatMessage>
) {
  setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
}

function updateMessageWith(
  setMessages: SetMessagesFn,
  id: string,
  updater: (m: ChatMessage) => Partial<ChatMessage>
) {
  setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updater(m) } : m))
}

// ─── Citation mapping ───

function mapCitations(completed: CompletedContentPart): CitationInfo[] {
  return (completed.citations || []).map(c => ({
    citationId: c.citationId,
    offset: c.offset,
    length: c.length,
    sources: c.sources.map(s => ({
      title: s.title,
      number: s.number,
      url: isCitationSourceUrl(s) ? s.url : undefined,
      downloadUrl: isCitationSourceMedia(s) ? s.downloadUrl : undefined
    }))
  }))
}

// ─── Tool call completion ───

function handleToolCallComplete(
  setMessages: SetMessagesFn,
  assistantId: string,
  toolCallId: string,
  endEvent: { output?: unknown; isError?: boolean }
) {
  const output = typeof endEvent.output === 'string'
    ? endEvent.output
    : JSON.stringify(endEvent.output ?? '')
  setMessages(prev => prev.map(m =>
    m.id === assistantId
      ? {
          ...m,
          toolCalls: (m.toolCalls || []).map(tc =>
            tc.toolCallId === toolCallId
              ? { ...tc, output, isError: endEvent.isError, isComplete: true }
              : tc
          )
        }
      : m
  ))
}

// ─── Content part handlers ───

function handleStreamingContent(
  part: any,
  assistantId: string,
  exchangeId: string,
  setMessages: SetMessagesFn,
  state: { fullContent: string },
  contentType: ChatMessage['contentType']
) {
  part.onChunk((chunk: any) => {
    state.fullContent += chunk.data || ''
    updateMessage(setMessages, assistantId, { content: state.fullContent, contentType })
  })

  part.onCompleted((completed: CompletedContentPart) => {
    const citations = mapCitations(completed)
    updateMessageWith(setMessages, assistantId, (m) => ({
      content: state.fullContent,
      contentType,
      isStreaming: false,
      exchangeId,
      citations: citations.length > 0 ? citations : m.citations
    }))
  })
}

function handleImageContent(
  part: any,
  assistantId: string,
  exchangeId: string,
  setMessages: SetMessagesFn
) {
  let imageChunks = ''

  part.onChunk((chunk: any) => {
    imageChunks += chunk.data || ''
    updateMessage(setMessages, assistantId, { contentType: 'image', imageData: imageChunks })
  })

  part.onContentPartEnd(() => {
    updateMessage(setMessages, assistantId, {
      contentType: 'image',
      imageData: imageChunks,
      isStreaming: false,
      exchangeId
    })
  })
}

// ─── Assistant message event handler setup ───

function setupAssistantHandlers(
  message: MessageStream,
  assistantMessageId: string,
  exchangeId: string,
  setMessages: SetMessagesFn,
  pendingInterruptRef: { current: PendingInterruptMap }
) {
  const contentState = { fullContent: '' }

  message.onToolCallStart((toolCall) => {
    const info: ToolCallInfo = {
      toolCallId: toolCall.toolCallId,
      toolName: toolCall.startEvent.toolName,
      input: typeof toolCall.startEvent.input === 'string'
        ? toolCall.startEvent.input
        : JSON.stringify(toolCall.startEvent.input ?? ''),
      isComplete: false
    }
    updateMessageWith(setMessages, assistantMessageId, (m) => ({
      toolCalls: [...(m.toolCalls || []), info]
    }))
    toolCall.onToolCallEnd((endEvent) => {
      handleToolCallComplete(setMessages, assistantMessageId, toolCall.toolCallId, endEvent)
    })
  })

  message.onInterruptStart(({ interruptId, startEvent }) => {
    const interruptInfo: InterruptInfo = {
      interruptId,
      type: startEvent.type,
      value: startEvent.type === InterruptType.ToolCallConfirmation ? startEvent.value : undefined,
      resolved: false
    }
    pendingInterruptRef.current.set(assistantMessageId, { message, interruptId })
    updateMessage(setMessages, assistantMessageId, { interrupt: interruptInfo })
  })

  message.onContentPartStart((part) => {
    const mimeType = part.startEvent?.mimeType
    if (mimeType === 'text/html') {
      handleStreamingContent(part, assistantMessageId, exchangeId, setMessages, contentState, 'html')
    } else if (part.isText || part.isMarkdown) {
      const contentType = part.isMarkdown ? 'markdown' as const : 'text' as const
      handleStreamingContent(part, assistantMessageId, exchangeId, setMessages, contentState, contentType)
    } else if (part.isImage) {
      handleImageContent(part, assistantMessageId, exchangeId, setMessages)
    }
  })
}

// ─── Exchange event handler setup (extracted to reduce nesting in ensureSession) ───

function setupExchangeHandlers(
  session: SessionStream,
  exchangeAssistantIdRef: { current: Map<string, string> },
  setMessages: SetMessagesFn,
  pendingInterruptRef: { current: PendingInterruptMap },
  setIsStreaming: (v: boolean) => void,
  setError: (error: string | null) => void
) {
  session.onExchangeStart((exchange) => {
    const assistantId = exchangeAssistantIdRef.current.get(exchange.exchangeId)
    if (!assistantId) return

    setIsStreaming(true)

    exchange.onMessageStart((message) => {
      if (!message.isAssistant) return
      setupAssistantHandlers(message, assistantId, exchange.exchangeId, setMessages, pendingInterruptRef)
    })

    exchange.onExchangeEnd(() => {
      exchangeAssistantIdRef.current.delete(exchange.exchangeId)
      setIsStreaming(false)
    })

    exchange.onErrorStart((err) => {
      exchangeAssistantIdRef.current.delete(exchange.exchangeId)
      setError(err.message || 'Exchange error')
      setIsStreaming(false)
    })
  })
}

// ─── Hook ───

export function useChat(
  exchanges: Exchanges | null,
  setError: (error: string | null) => void,
  onLabelUpdate?: (label: string) => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [exchangesHasMore, setExchangesHasMore] = useState(false)

  const sessionRef = useRef<SessionStream | null>(null)
  const exchangesCursorRef = useRef<{ value: string } | undefined>(undefined)
  const pendingInterruptRef = useRef<PendingInterruptMap>(new Map())
  const conversationRef = useRef<ConversationGetResponse | null>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const onLabelUpdateRef = useRef(onLabelUpdate)
  onLabelUpdateRef.current = onLabelUpdate

  // Maps exchange IDs → assistant message IDs for client-initiated exchanges.
  // Pre-registered before startExchange() so onExchangeStart can look up the ID.
  const exchangeAssistantIdRef = useRef<Map<string, string>>(new Map())

  // ─── Conversation ref management ───

  const setConversation = useCallback((conversation: ConversationGetResponse | null) => {
    conversationRef.current = conversation
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setExchangesHasMore(false)
    exchangesCursorRef.current = undefined
    exchangeAssistantIdRef.current.clear()
  }, [])

  // ─── Helpers ───

  const exchangesToChatMessages = (items: ExchangeGetResponse[]): ChatMessage[] => {
    const msgs: ChatMessage[] = []
    for (const exchange of items) {
      for (const message of exchange.messages || []) {
        const contentPartData = message.contentParts?.[0]?.data
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
    return msgs
  }

  // ─── Session management ───

  const ensureSession = useCallback((): Promise<void> => {
    if (sessionRef.current) return Promise.resolve()

    const conversation = conversationRef.current
    if (!conversation) {
      return Promise.reject(new Error('No active conversation. Please create a conversation first.'))
    }

    let session: SessionStream
    try {
      session = conversation.startSession({ echo: true, logLevel: LogLevel.Debug })
    } catch (err) {
      return Promise.reject(err instanceof Error ? err : new Error('Failed to start session'))
    }

    setupExchangeHandlers(
      session, exchangeAssistantIdRef, setMessages, pendingInterruptRef, setIsStreaming, setError
    )

    session.onLabelUpdated((event) => {
      onLabelUpdateRef.current?.(event.label)
    })

    return new Promise<void>((resolve, reject) => {
      session.onSessionStarted(() => {
        sessionRef.current = session
        resolve()
      })

      session.onSessionEnd(() => {
        sessionRef.current = null
        setIsStreaming(false)
      })

      session.onErrorStart((err) => {
        setIsStreaming(false)
        if (!sessionRef.current) {
          reject(new Error(err.message || 'Session error'))
        } else {
          setError(err.message || 'Session error')
        }
      })
    })
  }, [setError])

  const endSession = useCallback(() => {
    if (sessionRef.current) {
      conversationRef.current?.endSession()
      sessionRef.current = null
    }
  }, [])

  // ─── Exchange history ───

  const loadHistory = useCallback(async (conversationId: string) => {
    if (!exchanges) return

    try {
      const response = await exchanges.getAll(conversationId, { pageSize: 20 })
      setExchangesHasMore(response.hasNextPage)
      exchangesCursorRef.current = response.nextCursor
      setMessages(exchangesToChatMessages(response.items.toReversed()))
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }, [exchanges])

  const loadMoreExchanges = useCallback(async () => {
    const conversation = conversationRef.current
    if (!exchanges || !conversation || !exchangesCursorRef.current) return

    try {
      const response = await exchanges.getAll(conversation.id, {
        pageSize: 50,
        cursor: exchangesCursorRef.current
      })
      setExchangesHasMore(response.hasNextPage)
      exchangesCursorRef.current = response.nextCursor
      const olderMsgs = exchangesToChatMessages(response.items.toReversed())
      setMessages(prev => [...olderMsgs, ...prev])
    } catch (err) {
      console.error('Failed to load more exchanges:', err)
    }
  }, [exchanges])

  // ─── Feedback ───

  const submitFeedback = useCallback(async (messageId: string, rating: 'positive' | 'negative') => {
    const conversation = conversationRef.current
    if (!exchanges || !conversation) return

    const message = messagesRef.current.find(m => m.id === messageId)
    if (!message?.exchangeId) return

    try {
      const sdkRating = rating === 'positive' ? FeedbackRating.Positive : FeedbackRating.Negative
      await exchanges.createFeedback(conversation.id, message.exchangeId, { rating: sdkRating })
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, feedbackRating: rating } : m)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
    }
  }, [exchanges, setError])

  // ─── Interrupts ───

  const resolveInterrupt = useCallback(async (messageId: string, approved: boolean) => {
    const pending = pendingInterruptRef.current.get(messageId)
    if (!pending) return

    try {
      pending.message.sendInterruptEnd(pending.interruptId, { approved })
      pendingInterruptRef.current.delete(messageId)
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId && m.interrupt
            ? { ...m, interrupt: { ...m.interrupt, resolved: true, approved } }
            : m
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve interrupt')
    }
  }, [setError])

  // ─── Start exchange (sends user message; response handled by onExchangeStart) ───

  const startExchange = useCallback(async (
    content: string,
    assistantMessageId: string,
    attachments: ConversationAttachmentUploadResponse[] = []
  ) => {
    if (!sessionRef.current) return

    // Pre-register assistantId so onExchangeStart (fired by echo) can find it
    const exchangeId = `exchange-${Date.now()}-${crypto.randomUUID().slice(0, 12)}`
    exchangeAssistantIdRef.current.set(exchangeId, assistantMessageId)

    const exchange = sessionRef.current.startExchange({ exchangeId })

    // Send user message
    const message = exchange.startMessage({ role: MessageRole.User })

    if (content.trim()) {
      await message.sendContentPart({ data: content })
    }

    for (const attachment of attachments) {
      message.startContentPart({
        mimeType: attachment.mimeType,
        externalValue: { uri: attachment.uri }
      }).sendContentPartEnd()
    }

    message.sendMessageEnd()
  }, [])

  // ─── Send message ───

  const sendMessage = useCallback(async (content: string, attachments?: File[]) => {
    const conversation = conversationRef.current
    const hasContent = content.trim().length > 0
    const hasAttachments = attachments && attachments.length > 0

    if (!conversation || (!hasContent && !hasAttachments)) return
    setError(null)

    // Upload attachments
    let uploaded: ConversationAttachmentUploadResponse[] = []
    if (attachments && attachments.length > 0) {
      try {
        uploaded = await Promise.all(
          attachments.map(file => conversation.uploadAttachment(file))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload attachments')
        return
      }
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: MessageRole.User,
      content: content.trim(),
      timestamp: new Date(),
      attachments: uploaded.map(a => a.name)
    }
    setMessages(prev => [...prev, userMessage])

    // Add assistant placeholder
    const assistantId = `assistant-${Date.now()}`
    setMessages(prev => [...prev, {
      id: assistantId,
      role: MessageRole.Assistant,
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }])
    setIsStreaming(true)

    try {
      await ensureSession()
      startExchange(content, assistantId, uploaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setIsStreaming(false)
    }
  }, [ensureSession, startExchange, setError])

  return {
    messages,
    isStreaming,
    exchangesHasMore,
    setConversation,
    sendMessage,
    loadHistory,
    loadMoreExchanges,
    submitFeedback,
    resolveInterrupt,
    ensureSession,
    endSession,
    clearMessages,
  }
}
