/**
 * useConversations - Hook for conversation-related operations
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';
import { SortOrder } from '@uipath/uipath-typescript/conversational-agent';

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
        sort: SortOrder.Descending,
        pageSize: 20
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
      if (session && conversation?.id !== conversationId) {
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
    if (!conversation) return;
    setError('');

    try {
      const newLabel = `Updated: ${new Date().toLocaleTimeString()}`;
      // Use object method instead of service method
      const response = await conversation.update({ label: newLabel });

      console.log('[Conversation API] update response (using object method):', response);
      setConversation(response);
      setSuccessMessage('Conversation label updated (using object method)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to update conversation: ${message}`);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    setError('');

    try {
      // Find the conversation object to use its delete method
      const convToDelete = conversationList.find(c => c.id === conversationId) ||
                          (conversation?.id === conversationId ? conversation : null);

      if (!convToDelete) {
        setError('Conversation not found');
        return;
      }

      // Use object method instead of service method
      await convToDelete.delete();
      console.log('[Conversation API] delete completed (using object method)');

      setConversationList(prev => prev.filter(c => c.id !== conversationId));

      if (conversation?.id === conversationId) {
        // End the WebSocket session before clearing state
        if (session) {
          console.log('[Conversation] Ending session for deleted conversation');
          session.sendSessionEnd();
        }
        setConversation(null);
        setSession(null);
        setMessages([]);
      }

      setSuccessMessage('Conversation deleted (using object method)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to delete conversation: ${message}`);
    }
  };

  const closeConversation = () => {
    if (!conversation) return;

    console.log('[Conversation] Closing conversation:', conversation.id);

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
