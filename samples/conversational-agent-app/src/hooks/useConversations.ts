/**
 * useConversations - Manages conversation list, CRUD, and pagination
 */

import { useState, useRef, useCallback } from 'react'
import type { ConversationalAgent, ConversationGetResponse } from '@uipath/uipath-typescript/conversational-agent'

export function useConversations(
  conversationalAgent: ConversationalAgent | null,
  setError: (error: string | null) => void
) {
  const [conversations, setConversations] = useState<ConversationGetResponse[]>([])
  const [currentConversation, setCurrentConversation] = useState<ConversationGetResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const nextCursorRef = useRef<{ value: string } | undefined>(undefined)
  const conversationsRef = useRef(conversations)
  conversationsRef.current = conversations

  const load = useCallback(async () => {
    if (!conversationalAgent) return
    setIsLoading(true)
    setError(null)

    try {
      const response = await conversationalAgent.conversations.getAll({ pageSize: 20 })
      setConversations(response.items)
      setHasMore(response.hasNextPage)
      nextCursorRef.current = response.nextCursor
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setIsLoading(false)
    }
  }, [conversationalAgent, setError])

  const loadMore = useCallback(async () => {
    if (!conversationalAgent || !nextCursorRef.current) return
    setIsLoading(true)

    try {
      const response = await conversationalAgent.conversations.getAll({
        pageSize: 20,
        cursor: nextCursorRef.current
      })
      setConversations(prev => [...prev, ...response.items])
      setHasMore(response.hasNextPage)
      nextCursorRef.current = response.nextCursor
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more conversations')
    } finally {
      setIsLoading(false)
    }
  }, [conversationalAgent, setError])

  const addToFront = useCallback((conversation: ConversationGetResponse) => {
    setConversations(prev => [conversation, ...prev])
  }, [])

  /** Deletes a conversation via SDK and removes from list. Returns true on success. */
  const deleteConversation = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      const conversation = conversationsRef.current.find(c => c.id === id)
      if (conversation) await conversation.delete()
      setConversations(prev => prev.filter(c => c.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation')
      return false
    }
  }, [setError])

  /** Renames a conversation via SDK and updates list + current. */
  const renameConversation = useCallback(async (id: string, newLabel: string) => {
    setError(null)
    try {
      const conversation = conversationsRef.current.find(c => c.id === id)
      if (!conversation) return
      const updatedConversation = await conversation.update({ label: newLabel })
      setConversations(prev => prev.map(c => c.id === id ? updatedConversation : c))
      setCurrentConversation(prev => prev?.id === id ? updatedConversation : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename conversation')
    }
  }, [setError])

  /** Updates the label in local state (no API call — used for server-pushed label updates). */
  const updateLabel = useCallback((id: string, label: string) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, label } as ConversationGetResponse : c
    ))
    setCurrentConversation(prev =>
      prev?.id === id ? { ...prev, label } as ConversationGetResponse : prev
    )
  }, [])

  return {
    conversations,
    currentConversation,
    isLoading,
    hasMore,
    load,
    loadMore,
    addToFront,
    setCurrentConversation,
    updateLabel,
    deleteConversation,
    renameConversation,
  }
}
