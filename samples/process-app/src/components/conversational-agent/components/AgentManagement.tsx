/**
 * AgentManagement - Agent selection, details, and conversation creation
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';
import { useAgents, useConversations } from '../hooks';

export function AgentManagement() {
  const { chat } = useConversationalAgentContext();
  const { setInputMessage } = chat;
  const {
    agents, selectedAgent, agentAppearance, isLoading: isLoadingAgents,
    loadAgents, getAgentDetails, selectAgent
  } = useAgents();
  const { hasActiveConversation, createConversation, closeConversation } = useConversations();

  return (
    <div className="mb-6 p-4 bg-white rounded-lg border border-gray-300 shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Agent Management</h2>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={loadAgents}
          disabled={isLoadingAgents}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoadingAgents ? 'Loading...' : 'Load Agents'}
        </button>

        {agents.length > 0 && (
          <>
            <select
              value={selectedAgent?.id ?? ''}
              onChange={(e) => selectAgent(e.target.value ? parseInt(e.target.value) : null)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded"
            >
              <option value="">Select Agent</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name || `Agent ${agent.id}`}
                </option>
              ))}
            </select>

            <button
              onClick={getAgentDetails}
              disabled={!selectedAgent}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              Get Details
            </button>

            <button
              onClick={createConversation}
              disabled={!selectedAgent || hasActiveConversation}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {hasActiveConversation ? 'Conversation Active' : 'Create Conversation'}
            </button>

            {hasActiveConversation && (
              <button
                onClick={closeConversation}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Close Conversation
              </button>
            )}
          </>
        )}
      </div>

      {/* Agent Details */}
      {agentAppearance && (
        <div className="mt-4 p-4 bg-indigo-50 rounded border border-indigo-200">
          <h3 className="font-semibold text-indigo-900 mb-3">Agent Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
            <div><span className="font-medium text-indigo-800">ID:</span> <span className="ml-2 text-indigo-700">{agentAppearance.id}</span></div>
            <div><span className="font-medium text-indigo-800">Name:</span> <span className="ml-2 text-indigo-700">{agentAppearance.name}</span></div>
            <div><span className="font-medium text-indigo-800">Folder ID:</span> <span className="ml-2 text-indigo-700">{agentAppearance.folderId}</span></div>
            {agentAppearance.description && (
              <div className="md:col-span-2"><span className="font-medium text-indigo-800">Description:</span> <span className="ml-2 text-indigo-700">{agentAppearance.description}</span></div>
            )}
          </div>

          {agentAppearance.appearance && (
            <div className="border-t border-indigo-200 pt-3 mt-3">
              <h4 className="font-medium text-indigo-800 mb-2">Appearance Settings</h4>
              <div className="space-y-2 text-sm">
                <p className="text-indigo-800"><strong>Welcome Title:</strong> {agentAppearance.appearance.welcomeTitle}</p>
                {agentAppearance.appearance.welcomeDescription && (
                  <p className="text-indigo-700"><strong>Welcome Description:</strong> {agentAppearance.appearance.welcomeDescription}</p>
                )}
              </div>

              {agentAppearance.appearance.startingPrompts && agentAppearance.appearance.startingPrompts.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-indigo-800 mb-2">Starting Prompts:</p>
                  <div className="flex flex-wrap gap-2">
                    {agentAppearance.appearance.startingPrompts.map((prompt) => (
                      <button
                        key={prompt.id}
                        onClick={() => setInputMessage(prompt.actualPrompt)}
                        className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded hover:bg-indigo-200"
                        title={prompt.actualPrompt}
                      >
                        {prompt.displayPrompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
