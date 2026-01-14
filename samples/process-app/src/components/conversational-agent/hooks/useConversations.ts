/**
 * useConversations - Hook for conversation-related operations
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';

export function useConversations() {
  const { conversationalAgentService, agent, conversation: convState, chat, ui } = useConversationalAgentContext();
  const { selectedAgent } = agent;
  const { conversation, conversationList, isLoading, setConversation, setConversationList, setIsLoading } = convState;
  const { session, setSession, setMessages } = chat;
  const { setError, setSuccessMessage } = ui;

  const createConversation = async () => {
    if (!conversationalAgentService || !selectedAgent) {
      setError('Please select an agent first');
      return;
    }

    setError('');

    try {
      // End existing session before creating new conversation
      if (session) {
        console.log('[Conversation] Ending existing session before creating new conversation');
        session.sendSessionEnd();
        setSession(null);
      }

      const response = await conversationalAgentService.conversations.create({
        agentReleaseId: selectedAgent.id,
        folderId: selectedAgent.folderId,
        label: `Test Conversation ${new Date().toLocaleTimeString()}`,
        autogenerateLabel: true
      });

      console.log('[Conversation API] create response:', response);
      setConversation(response);
      setMessages([]);
      setSuccessMessage('Conversation created successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create conversation: ${message}`);
    }
  };

  const listConversations = async () => {
    if (!conversationalAgentService) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await conversationalAgentService.conversations.getAll({
        sort: 'descending',
        limit: 20
      });

      console.log('[Conversation API] getAll response:', response);
      setConversationList(response.items);
      setSuccessMessage(`Loaded ${response.items.length} conversation(s)`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to list conversations: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    if (!conversationalAgentService) return;
    setError('');

    try {
      // End existing session before switching to different conversation
      if (session && conversation?.conversationId !== conversationId) {
        console.log('[Conversation] Ending existing session before loading different conversation');
        session.sendSessionEnd();
        setSession(null);
        setMessages([]);
      }

      const response = await conversationalAgentService.conversations.getById(conversationId);
      console.log('[Conversation API] getById response:', response);

      setConversation(response);
      setSuccessMessage('Conversation loaded');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to get conversation: ${message}`);
    }
  };

  const updateConversationLabel = async () => {
    if (!conversationalAgentService || !conversation) return;
    setError('');

    try {
      const newLabel = `Updated: ${new Date().toLocaleTimeString()}`;
      const response = await conversationalAgentService.conversations.update(conversation.conversationId, { label: newLabel });

      console.log('[Conversation API] update response:', response);
      setConversation(response);
      setSuccessMessage('Conversation label updated');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to update conversation: ${message}`);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!conversationalAgentService) return;
    setError('');

    try {
      await conversationalAgentService.conversations.remove(conversationId);
      console.log('[Conversation API] remove completed');

      setConversationList(prev => prev.filter(c => c.conversationId !== conversationId));

      if (conversation?.conversationId === conversationId) {
        // End the WebSocket session before clearing state
        if (session) {
          console.log('[Conversation] Ending session for deleted conversation');
          session.sendSessionEnd();
        }
        setConversation(null);
        setSession(null);
        setMessages([]);
      }

      setSuccessMessage('Conversation deleted');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to delete conversation: ${message}`);
    }
  };

  const closeConversation = () => {
    if (!conversation) return;

    console.log('[Conversation] Closing conversation:', conversation.conversationId);

    // End the WebSocket session before clearing state
    if (session) {
      console.log('[Conversation] Ending session for closed conversation');
      session.sendSessionEnd();
    }

    // Clear the active conversation and session
    setConversation(null);
    setSession(null);
    setMessages([]);
    setSuccessMessage('Conversation closed');
  };

  return {
    conversation,
    conversationList,
    isLoading,
    hasActiveConversation: !!conversation,
    createConversation,
    listConversations,
    loadConversation,
    updateConversationLabel,
    deleteConversation,
    closeConversation
  };
}
