/**
 * useAgents - Manages agent loading and selection
 */

import { useState, useCallback } from 'react'
import type { ConversationalAgent, AgentGetResponse } from '@uipath/uipath-typescript/conversational-agent'

export function useAgents(
  conversationalAgent: ConversationalAgent | null,
  setError: (error: string | null) => void
) {
  const [agents, setAgents] = useState<AgentGetResponse[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentGetResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadAgents = useCallback(async () => {
    if (!conversationalAgent) return
    setIsLoading(true)
    setError(null)

    try {
      const agentList = await conversationalAgent.getAll()  
      setAgents(agentList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setIsLoading(false)
    }
  }, [conversationalAgent, setError])

  const selectAgent = useCallback((agent: AgentGetResponse | null) => {
    setSelectedAgent(agent)
  }, [])

  return {
    agents,
    selectedAgent,
    isLoading,
    loadAgents,
    selectAgent,
  }
}
