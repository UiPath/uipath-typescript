/**
 * ConnectionReadinessCard - In-chat card that prompts users to connect
 * OAuth connectors before chatting. Three visual states:
 * 1. Collapsed bar — all connected or user collapsed. Shows count + Show button.
 * 2. Expanded broken — connections expired/failed. Red border, Reconnect buttons.
 * 3. Expanded setup — connections need initial setup. Yellow border, Connect buttons.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ConversationalAgent, AvailableConnectionsResponse } from '@uipath/uipath-typescript/conversational-agent'
import { Spinner } from './Spinner'

export interface ConnectorReadiness {
  connectorKey: string
  connectorName: string
  connectorImage?: string
  isConfigurable: boolean
  currentConnectionId: string | null
  currentConnectionName: string | null
  currentConnectionState?: 'Enabled' | 'Disabled' | 'Expired' | 'Failed'
  connectionsUrl?: string
}

interface ConnectionReadinessCardProps {
  connectors: ConnectorReadiness[]
  conversationalAgent: ConversationalAgent
  agentId: number
  folderId: number
  onAllConnected?: () => void
  onOpenSettings?: () => void
  defaultCollapsed?: boolean
}

const POLL_INTERVAL_MS = 500

export function ConnectionReadinessCard({
  connectors,
  conversationalAgent,
  agentId,
  folderId,
  onAllConnected,
  onOpenSettings,
  defaultCollapsed = false,
}: ConnectionReadinessCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [connectingKey, setConnectingKey] = useState<string | null>(null)
  const [localConnectors, setLocalConnectors] = useState<ConnectorReadiness[]>(connectors)
  const localConnectorsRef = useRef<ConnectorReadiness[]>(connectors)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollInFlightRef = useRef(false)
  const fetchingRef = useRef(false)
  const oauthSessionRef = useRef(0)

  const updateLocalConnectors = (next: ConnectorReadiness[] | ((prev: ConnectorReadiness[]) => ConnectorReadiness[])) => {
    setLocalConnectors(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next
      localConnectorsRef.current = resolved
      return resolved
    })
  }

  // Sync when prop changes
  useEffect(() => {
    updateLocalConnectors(connectors)
  }, [connectors])

  // Auto-collapse once conversation starts
  useEffect(() => {
    if (defaultCollapsed) setCollapsed(true)
  }, [defaultCollapsed])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [])

  const unconnected = localConnectors.filter(c => c.isConfigurable && !c.currentConnectionId)
  const broken = localConnectors.filter(
    c => c.isConfigurable && c.currentConnectionId && c.currentConnectionState && c.currentConnectionState !== 'Enabled',
  )
  const allConnected = unconnected.length === 0 && broken.length === 0

  // Notify parent when everything is connected
  useEffect(() => {
    if (allConnected) onAllConnected?.()
  }, [allConnected, onAllConnected])

  const mapItemsToReadiness = (items: AvailableConnectionsResponse): ConnectorReadiness[] =>
    items.map(item => ({
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

  // Re-fetch connections on tab visibility change
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'visible') return
      if (fetchingRef.current || pollingRef.current) return
      fetchingRef.current = true
      conversationalAgent
        .getAvailableConnections(agentId, folderId)
        .then((items: AvailableConnectionsResponse) => {
          updateLocalConnectors(mapItemsToReadiness(items))
        })
        .catch((error) => { console.warn('Failed to refresh connection readiness on tab focus:', error) })
        .finally(() => { fetchingRef.current = false })
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [conversationalAgent, agentId, folderId])

  const startOAuthFlow = useCallback(async (connectorKey: string) => {
    setConnectingKey(connectorKey)

    // Cancel any previous polling and start a new OAuth session
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
    const oauthSession = ++oauthSessionRef.current

    try {
      const { authUrl, sessionId, expiresTime } = await conversationalAgent.getConnectionAuthUrl(connectorKey)
      if (oauthSessionRef.current !== oauthSession) return
      window.open(authUrl, '_blank', 'noopener,noreferrer')

      pollingRef.current = setInterval(async () => {
        if (pollInFlightRef.current) return
        pollInFlightRef.current = true
        try {
          if (oauthSessionRef.current !== oauthSession) {
            if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
            return
          }
          if (Date.now() > expiresTime) {
            if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
            if (oauthSessionRef.current === oauthSession) setConnectingKey(null)
            return
          }
          const status = await conversationalAgent.getConnectionSessionStatus(sessionId)
          if (oauthSessionRef.current !== oauthSession) return
          if (status.status === 'success' && status.connectionId) {
            if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
            setConnectingKey(null)

            // Auto-save using ref to avoid stale closure
            try {
              await conversationalAgent.updateConnectionSelections(agentId, folderId, {
                selections: localConnectorsRef.current.filter(c => c.isConfigurable).map(c => ({
                  connectorKey: c.connectorKey,
                  connectionId: c.connectorKey === connectorKey ? status.connectionId : c.currentConnectionId,
                })),
              })
            } catch (error) {
              console.warn('Failed to auto-save connection selection:', error)
            }

            // Rebuild state from server after auto-save
            if (oauthSessionRef.current !== oauthSession) return
            try {
              const items = await conversationalAgent.getAvailableConnections(agentId, folderId)
              if (oauthSessionRef.current === oauthSession) {
                updateLocalConnectors(mapItemsToReadiness(items))
              }
            } catch (error) {
              // Fallback: optimistically update just the connected connector
              if (oauthSessionRef.current === oauthSession) {
                updateLocalConnectors(prev =>
                  prev.map(c =>
                    c.connectorKey === connectorKey
                      ? { ...c, currentConnectionId: status.connectionId, currentConnectionState: 'Enabled' as const }
                      : c,
                  ),
                )
              }
              console.warn('Failed to re-fetch connections after auto-save:', error)
            }
          } else if (status.status === 'failed') {
            if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
            if (oauthSessionRef.current === oauthSession) setConnectingKey(null)
          }
        } catch (error) {
          console.warn('Failed to poll connection session status:', error)
        } finally {
          pollInFlightRef.current = false
        }
      }, POLL_INTERVAL_MS)
    } catch (error) {
      console.warn('Failed to start OAuth flow:', error)
      if (oauthSessionRef.current === oauthSession) setConnectingKey(null)
    }
  }, [conversationalAgent, agentId, folderId])

  const getStatusText = (connector: ConnectorReadiness): string => {
    if (connectingKey === connector.connectorKey) return 'Waiting for sign-in...'
    if (connector.currentConnectionId && connector.currentConnectionName) {
      if (connector.currentConnectionState && connector.currentConnectionState !== 'Enabled') {
        return `${connector.currentConnectionName} · ${connector.currentConnectionState}`
      }
      return `Connected as ${connector.currentConnectionName}`
    }
    return 'Not connected'
  }

  // ── Collapsed bar ──
  if (collapsed || allConnected) {
    const neededCount = unconnected.length + broken.length
    if (neededCount === 0) return null

    return (
      <div className="mx-6 my-3 flex items-center justify-between rounded-lg border border-white/20 bg-chat-input px-4 py-3">
        <span className="text-sm text-gray-400">
          {neededCount === 1
            ? '1 connection still needed'
            : `${neededCount} connections still needed`}
        </span>
        <button
          onClick={() => setCollapsed(false)}
          className="text-sm text-accent hover:text-accent-hover transition-colors"
        >
          Show
        </button>
      </div>
    )
  }

  // ── Expanded broken card ──
  if (broken.length > 0) {
    return (
      <div className="mx-6 my-3 rounded-lg border-2 border-red-500/60 bg-chat-input p-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold">
              {broken.length === 1
                ? '1 connection needs fixing'
                : `${broken.length} connections need fixing`}
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              Your setup is still here, you just need to sign in again.
            </p>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Hide
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {[...broken, ...unconnected].map(connector => (
            <ConnectorRow
              key={connector.connectorKey}
              connector={connector}
              statusText={getStatusText(connector)}
              isBroken={broken.includes(connector)}
              isConnecting={connectingKey === connector.connectorKey}
              disabled={connectingKey !== null}
              onConnect={() => startOAuthFlow(connector.connectorKey)}
            />
          ))}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Signing in opens a small window. It closes on its own and this list updates.
        </p>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="mt-1 text-sm text-accent hover:text-accent-hover transition-colors"
          >
            Open connections
          </button>
        )}
      </div>
    )
  }

  // ── Expanded setup card ──
  const connectedCount = localConnectors.filter(c => c.isConfigurable && c.currentConnectionId).length
  const totalConfigurable = localConnectors.filter(c => c.isConfigurable).length

  return (
    <div className="mx-6 my-3 rounded-lg border-2 border-yellow-500/60 bg-chat-input p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            {connectedCount === 0
              ? 'One-time setup before I can help'
              : `${totalConfigurable - connectedCount} of ${totalConfigurable} connections still needed`}
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            Only the tools this agent actually uses are listed. Connect what you need now, the rest can wait.
          </p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Hide
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {localConnectors.filter(c => c.isConfigurable).map(connector => {
          const isConnected = !!connector.currentConnectionId && connector.currentConnectionState === 'Enabled'
          return (
            <ConnectorRow
              key={connector.connectorKey}
              connector={connector}
              statusText={getStatusText(connector)}
              isBroken={false}
              isConnected={isConnected}
              isConnecting={connectingKey === connector.connectorKey}
              disabled={connectingKey !== null}
              onConnect={() => startOAuthFlow(connector.connectorKey)}
            />
          )
        })}
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Signing in opens a small window. It closes on its own and this list updates.
      </p>

      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="mt-1 text-sm text-accent hover:text-accent-hover transition-colors"
        >
          Open connections
        </button>
      )}
    </div>
  )
}

// ─── ConnectorRow ───

function ConnectorRow({
  connector,
  statusText,
  isBroken,
  isConnected,
  isConnecting,
  disabled,
  onConnect,
}: {
  connector: ConnectorReadiness
  statusText: string
  isBroken: boolean
  isConnected?: boolean
  isConnecting: boolean
  disabled: boolean
  onConnect: () => void
}) {
  return (
    <div className={`flex items-center justify-between rounded-md border px-3 py-2.5 ${
      isConnected
        ? 'border-green-500/30 bg-green-500/5'
        : isBroken
          ? 'border-red-500/30'
          : 'border-white/10'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        {connector.connectorImage && (
          <img src={connector.connectorImage} alt="" className="w-6 h-6 object-contain flex-shrink-0 rounded" />
        )}
        <div className="min-w-0">
          <span className="text-sm font-medium block truncate">
            {connector.connectorName}
          </span>
          <span className={`text-xs block truncate ${
            isConnected ? 'text-green-400' : isBroken ? 'text-red-400' : 'text-gray-500'
          }`}>
            {statusText}
          </span>
        </div>
      </div>
      {!isConnected && (
        <button
          onClick={onConnect}
          disabled={disabled}
          className="ml-3 flex-shrink-0 px-3 py-1.5 text-sm rounded-lg border border-white/20 hover:bg-white/10 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isConnecting ? (
            <>
              <Spinner className="w-3 h-3 border-gray-400" />
              Connecting...
            </>
          ) : isBroken ? (
            'Reconnect'
          ) : (
            'Connect'
          )}
        </button>
      )}
    </div>
  )
}
