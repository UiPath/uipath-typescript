/**
 * WelcomeScreen - Shown when no conversation is active
 */

import type { AgentGetResponse } from '@uipath/uipath-typescript/conversational-agent'

interface WelcomeScreenProps {
  selectedAgent: AgentGetResponse | null
  onSuggestionClick: (suggestion: string) => void
  disabled?: boolean
}

const SUGGESTIONS = [
  'Tell me about yourself',
  'What can you help me with?',
  'Give me an example',
  'How do I get started?',
]

export function WelcomeScreen({ selectedAgent, onSuggestionClick, disabled }: WelcomeScreenProps) {
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
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                className="p-4 bg-chat-input hover:bg-white/5 border border-white/10 rounded-lg text-left transition-colors disabled:opacity-50"
                onClick={() => onSuggestionClick(suggestion)}
                disabled={disabled}
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
