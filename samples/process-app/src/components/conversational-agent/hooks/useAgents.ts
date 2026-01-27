/**
 * useAgents - Hook for agent-related operations
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';

export function useAgents() {
  const { conversationalAgentService, agent, chat, ui } = useConversationalAgentContext();
  const { agents, selectedAgent, agentAppearance, isLoading, setAgents, setSelectedAgent, setAgentAppearance, setIsLoading } = agent;
  const { setInputMessage } = chat;
  const { setError, setSuccessMessage } = ui;

  const loadAgents = async () => {
    if (!conversationalAgentService) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await conversationalAgentService.agents.getAll();
      console.log('[Agent API] getAll response:', response);

      setAgents(response);
      if (response.length === 0) {
        setError('No agents found. Please configure agents in Orchestrator.');
      } else {
        setSuccessMessage(`Loaded ${response.length} agent(s)`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load agents: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentDetails = async () => {
    if (!conversationalAgentService || !selectedAgent) return;
    setError('');

    try {
      const response = await conversationalAgentService.agents.getById(selectedAgent.id, selectedAgent.folderId);
      console.log('[Agent API] getById response:', response);

      setAgentAppearance(response);
      setSuccessMessage('Agent appearance loaded');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to get agent details: ${message}`);
    }
  };

  const selectAgent = (agentId: number | null) => {
    const foundAgent = agentId ? agents.find(a => a.id === agentId) ?? null : null;
    setSelectedAgent(foundAgent);
    setAgentAppearance(null);
  };

  const useStartingPrompt = (prompt: string) => {
    setInputMessage(prompt);
  };

  return {
    agents,
    selectedAgent,
    agentAppearance,
    isLoading,
    loadAgents,
    getAgentDetails,
    selectAgent,
    useStartingPrompt
  };
}
