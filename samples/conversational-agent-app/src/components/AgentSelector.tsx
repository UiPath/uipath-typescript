/**
 * AgentSelector - Dropdown for selecting an agent
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useConversationalAgent } from '../context/ConversationalAgentContext'
import { Spinner } from './Spinner'

export function AgentSelector() {
  const { agents, selectedAgent, selectAgent, isLoadingAgents, loadAgents, loadConversations } = useConversationalAgent()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectAgent = useCallback(async (agent: typeof agents[0]) => {
    selectAgent(agent)
    setIsOpen(false)
    await loadConversations()
  }, [selectAgent, loadConversations])

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-chat-input border border-white/10 rounded-lg flex items-center justify-between hover:border-white/20 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="truncate text-sm">
            {isLoadingAgents ? 'Loading agents...' : selectedAgent?.name || 'Select an agent'}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-chat-input border border-white/10 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          {isLoadingAgents && (
            <div className="p-3 text-center text-gray-400">
              <Spinner className="w-5 h-5 border-accent mx-auto" />
            </div>
          )}
          {!isLoadingAgents && agents.length === 0 && (
            <div className="p-3 text-center text-gray-500">
              <p className="text-sm mb-2">No agents available</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  loadAgents()
                }}
                className="text-xs text-accent hover:underline"
              >
                Refresh
              </button>
            </div>
          )}
          {!isLoadingAgents && agents.length > 0 && (
            agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleSelectAgent(agent)}
                className={`w-full px-3 py-2.5 text-left hover:bg-white/5 flex items-center gap-2 transition-colors ${
                  selectedAgent?.id === agent.id ? 'bg-white/10' : ''
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  {agent.description && (
                    <p className="text-xs text-gray-500 truncate">{agent.description}</p>
                  )}
                </div>
                {selectedAgent?.id === agent.id && (
                  <svg className="w-4 h-4 text-accent ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
