/**
 * ConnectionsPanel - Settings panel for managing personal connections
 */

import { useState } from 'react'
import type {
  AvailableConnectionsItem,
  AvailableConnection,
} from '@uipath/uipath-typescript/conversational-agent'
import { useConnections } from '../hooks/useConnections'
import type { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent'
import { Spinner } from './Spinner'

interface ConnectionsPanelProps {
  conversationalAgent: ConversationalAgent | null
  agentId: number | undefined
  folderId: number | undefined
  onClose: () => void
  setError: (error: string | null) => void
}

export function ConnectionsPanel({
  conversationalAgent,
  agentId,
  folderId,
  onClose,
  setError,
}: ConnectionsPanelProps) {
  const {
    availableConnections,
    stagedSelections,
    isLoading,
    isSaving,
    isDirty,
    saveStatus,
    setSaveStatus,
    selectConnection,
    save,
    cancel,
  } = useConnections(conversationalAgent, agentId, folderId, setError)

  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-3 text-gray-400">
        <Spinner className="w-4 h-4 border-accent" />
        <span className="text-sm">Loading connections...</span>
      </div>
    )
  }

  if (availableConnections.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        No configurable connections for this agent.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-semibold">Connections</h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded transition-colors"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Save status */}
      {saveStatus && (
        <div className={`mx-6 mt-4 px-4 py-3 rounded-lg text-sm flex items-center justify-between ${
          saveStatus === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          <span>{saveStatus === 'success' ? 'Connections saved successfully.' : 'Failed to save connections.'}</span>
          <button onClick={() => setSaveStatus(null)} className="ml-2 hover:opacity-80">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Connection rows */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {availableConnections.map(item => (
          <ConnectionRow
            key={item.connectorKey}
            item={item}
            selectedConnectionId={stagedSelections[item.connectorKey] ?? ''}
            onSelect={(connectionId) => selectConnection(item.connectorKey, connectionId)}
          />
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
        <button
          onClick={cancel}
          disabled={!isDirty || isSaving}
          className="px-4 py-2 text-sm rounded-lg border border-white/20 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!isDirty || isSaving}
          className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSaving && <Spinner className="w-3.5 h-3.5 border-white" />}
          Save
        </button>
      </div>
    </div>
  )
}

// ─── ConnectionRow ───

interface ConnectionRowProps {
  item: AvailableConnectionsItem
  selectedConnectionId: string
  onSelect: (connectionId: string) => void
}

function ConnectionRow({ item, selectedConnectionId, onSelect }: ConnectionRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selectedConnection = item.connections.find(c => c.id === selectedConnectionId)

  const query = search.trim().toLowerCase()

  // Group connections by folder
  const grouped = item.connections.reduce<Record<string, AvailableConnection[]>>((groups, conn) => {
    const groupName = conn.personalWorkspace ? 'Personal Workspace' : (conn.folderName ?? 'Other')
    if (query && !conn.name.toLowerCase().includes(query) && !groupName.toLowerCase().includes(query)) {
      return groups
    }
    groups[groupName] = groups[groupName] ?? []
    groups[groupName].push(conn)
    return groups
  }, {})
  const groupNames = Object.keys(grouped)

  return (
    <div className="bg-white/5 rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Connector info */}
        <div className="flex items-center gap-3 min-w-0">
          {item.connectorImage && (
            <img
              src={item.connectorImage}
              alt=""
              className="w-6 h-6 object-contain flex-shrink-0 rounded"
            />
          )}
          <span className="font-medium text-sm truncate">
            {item.connectorName ?? item.connectorKey}
          </span>
        </div>

        {/* Status badge */}
        {selectedConnection && (
          <StatusBadge state={selectedConnection.state} />
        )}
      </div>

      {/* Connection selector */}
      <div className="mt-3 relative">
        <button
          type="button"
          onClick={() => { setIsOpen(!isOpen); setSearch('') }}
          className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
        >
          <span className={selectedConnection ? 'text-white' : 'text-gray-500'}>
            {selectedConnection?.name ?? '+ Connection'}
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-chat-input border border-white/20 rounded-lg shadow-xl overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-white/10 flex items-center gap-2">
              <input
                type="text"
                placeholder="Search connections..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm placeholder:text-gray-500 focus:outline-none"
                autoFocus
              />
              {item.configurationUrl && (
                <button
                  type="button"
                  onClick={() => window.open(item.configurationUrl, '_blank', 'noopener,noreferrer')}
                  className="text-accent text-xs whitespace-nowrap hover:underline"
                >
                  + Connection
                </button>
              )}
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {groupNames.length === 0 && (
                <div className="text-gray-500 text-sm p-3">No connections available</div>
              )}
              {groupNames.map(groupName => (
                <div key={groupName}>
                  <div className="text-xs text-gray-500 px-3 pt-3 pb-1">{groupName}</div>
                  {grouped[groupName].map(conn => (
                    <button
                      key={conn.id}
                      type="button"
                      onClick={() => { onSelect(conn.id); setIsOpen(false); setSearch('') }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/10 transition-colors ${
                        conn.id === selectedConnectionId ? 'bg-white/5' : ''
                      }`}
                    >
                      <span className="flex-1 truncate">{conn.name}</span>
                      <StatusBadge state={conn.state} size="sm" />
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Footer link */}
            {(item.connectionsUrl ?? item.configurationUrl) && (
              <button
                type="button"
                onClick={() => window.open(item.connectionsUrl ?? item.configurationUrl, '_blank', 'noopener,noreferrer')}
                className="w-full text-sm text-center py-3 border-t border-white/10 hover:bg-white/5 transition-colors"
              >
                Open connections
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── StatusBadge ───

const STATUS_STYLES: Record<string, string> = {
  Enabled: 'bg-green-500/15 text-green-400',
  Expired: 'bg-yellow-500/15 text-yellow-400',
  Disabled: 'bg-gray-500/15 text-gray-400',
  Failed: 'bg-red-500/15 text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  Enabled: 'Connected',
  Expired: 'Expired',
  Disabled: 'Disabled',
  Failed: 'Failed',
}

function StatusBadge({ state, size = 'default' }: { state: string; size?: 'default' | 'sm' }) {
  const style = STATUS_STYLES[state] ?? STATUS_STYLES.Disabled
  const label = STATUS_LABELS[state] ?? state
  return (
    <span className={`rounded-full font-medium ${style} ${
      size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'
    }`}>
      {label}
    </span>
  )
}
