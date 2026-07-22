/**
 * useConnections - Manages connection loading, selection, and saving
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  ConversationalAgent,
  AvailableConnectionsResponse,
  AvailableConnectionsItem,
} from '@uipath/uipath-typescript/conversational-agent'

type SelectionMap = Record<string, string>

const getInitialSelections = (items: AvailableConnectionsResponse): SelectionMap =>
  Object.fromEntries(items.map(item => [item.connectorKey, item.currentConnectionId ?? '']))

export function useConnections(
  conversationalAgent: ConversationalAgent | null,
  agentId: number | undefined,
  folderId: number | undefined,
  setError: (error: string | null) => void
) {
  const [availableConnections, setAvailableConnections] = useState<AvailableConnectionsResponse>([])
  const [initialSelections, setInitialSelections] = useState<SelectionMap>({})
  const [stagedSelections, setStagedSelections] = useState<SelectionMap>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null)

  const isDirty = useMemo(
    () => Object.keys(initialSelections).some(key => initialSelections[key] !== stagedSelections[key]),
    [initialSelections, stagedSelections]
  )

  const load = useCallback(async () => {
    if (!conversationalAgent || agentId === undefined || folderId === undefined) return
    setIsLoading(true)
    setSaveStatus(null)
    try {
      const items = await conversationalAgent.getAvailableConnections(agentId, folderId)
      const selections = getInitialSelections(items)
      setAvailableConnections(items)
      setInitialSelections(selections)
      setStagedSelections(selections)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections')
    } finally {
      setIsLoading(false)
    }
  }, [conversationalAgent, agentId, folderId, setError])

  // Load when agent changes
  useEffect(() => {
    load()
  }, [load])

  const selectConnection = useCallback((connectorKey: string, connectionId: string) => {
    setStagedSelections(prev => ({ ...prev, [connectorKey]: connectionId }))
  }, [])

  const save = useCallback(async () => {
    if (!conversationalAgent || agentId === undefined || folderId === undefined) return
    setIsSaving(true)
    setSaveStatus(null)
    try {
      const updatedItems = await conversationalAgent.updateConnectionSelections(agentId, folderId, {
        selections: Object.entries(stagedSelections)
          .filter(([, connectionId]) => Boolean(connectionId))
          .map(([connectorKey, connectionId]) => ({ connectorKey, connectionId }))
      })
      const selections = getInitialSelections(updatedItems)
      setAvailableConnections(updatedItems)
      setInitialSelections(selections)
      setStagedSelections(selections)
      setSaveStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save connections')
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }, [conversationalAgent, agentId, folderId, stagedSelections, setError])

  const cancel = useCallback(() => {
    setStagedSelections(initialSelections)
    setSaveStatus(null)
  }, [initialSelections])

  const getSelectedConnection = useCallback((item: AvailableConnectionsItem) => {
    const selectedId = stagedSelections[item.connectorKey]
    return item.connections.find(c => c.id === selectedId) ?? null
  }, [stagedSelections])

  return {
    availableConnections,
    stagedSelections,
    isLoading,
    isSaving,
    isDirty,
    saveStatus,
    setSaveStatus,
    load,
    selectConnection,
    save,
    cancel,
    getSelectedConnection,
  }
}
