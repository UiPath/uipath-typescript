/**
 * useExchanges - Hook for exchange history operations
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';

export function useExchanges() {
  const { conversationalAgentService, conversation: convState, exchange: exchState, ui } = useConversationalAgentContext();
  const { conversation } = convState;
  const { exchanges, isLoading, setExchanges, setIsLoading } = exchState;
  const { setError, setSuccessMessage } = ui;

  const listExchanges = async () => {
    if (!conversationalAgentService || !conversation) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await conversationalAgentService.conversations.exchanges.getAll(
        conversation.conversationId,
        { exchangeSort: 'descending', messageSort: 'ascending', pageSize: 10 }
      );

      console.log('[Exchange API] getAll response:', response);
      setExchanges(response.items);
      setSuccessMessage(`Loaded ${response.items.length} exchange(s)`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to list exchanges: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getExchangeDetails = async (exchangeId: string) => {
    if (!conversationalAgentService || !conversation) return;
    setError('');

    try {
      const response = await conversationalAgentService.conversations.exchanges.getById(
        conversation.conversationId,
        exchangeId,
        { messageSort: 'ascending' }
      );

      console.log('[Exchange API] getById response:', response);
      setSuccessMessage('Exchange details loaded - check console');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to get exchange: ${message}`);
    }
  };

  const submitFeedback = async (exchangeId: string, rating: 'positive' | 'negative') => {
    if (!conversationalAgentService || !conversation) return;
    setError('');

    try {
      await conversationalAgentService.conversations.exchanges.createFeedback(
        conversation.conversationId,
        exchangeId,
        { rating, comment: `Feedback from test: ${rating}` }
      );

      console.log('[Exchange API] createFeedback completed');
      setSuccessMessage(`Feedback "${rating}" submitted successfully`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to submit feedback: ${message}`);
    }
  };

  const getMessage = async (exchangeId: string, messageId: string) => {
    if (!conversationalAgentService || !conversation) return;
    setError('');

    try {
      const response = await conversationalAgentService.conversations.messages.getById(
        conversation.conversationId,
        exchangeId,
        messageId
      );

      console.log('[Message API] getById response:', response);
      setSuccessMessage('Message loaded - check console');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to get message: ${message}`);
    }
  };

  const getContentPart = async (exchangeId: string, messageId: string, contentPartId: string) => {
    if (!conversationalAgentService || !conversation) return;
    setError('');

    try {
      const response = await conversationalAgentService.conversations.messages.getContentPart(
        conversation.conversationId,
        exchangeId,
        messageId,
        contentPartId
      );

      console.log('[Message API] getContentPart response:', response);
      console.log('isDataInline:', response.isDataInline);
      console.log('isDataExternal:', response.isDataExternal);

      if (response.isDataInline) {
        const data = await response.getData();
        console.log('Content data:', data);
      } else if (response.isDataExternal) {
        console.log('External data URI - fetch separately');
      }

      setSuccessMessage('Content part loaded - check console');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('404') || message.includes('Not Found')) {
        setError('Content part not found. Note: getContentPart API only works for external content (files). Inline text is already in the message response.');
      } else {
        setError(`Failed to get content part: ${message}`);
      }
    }
  };

  return {
    exchanges,
    isLoading,
    listExchanges,
    getExchangeDetails,
    submitFeedback,
    getMessage,
    getContentPart
  };
}
