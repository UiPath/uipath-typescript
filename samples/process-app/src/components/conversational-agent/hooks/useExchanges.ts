/**
 * useExchanges - Hook for exchange history operations
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';
import { SortOrder, FeedbackRating } from '@uipath/uipath-typescript/conversational-agent';

export function useExchanges() {
  const { exchangeService, messageService, conversation: convState, exchange: exchState, ui } = useConversationalAgentContext();
  const { conversation } = convState;
  const { exchanges, isLoading, setExchanges, setIsLoading } = exchState;
  const { setError, setSuccessMessage } = ui;

  const listExchanges = async () => {
    if (!exchangeService || !conversation) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await exchangeService.getAll(
        conversation.id,
        { exchangeSort: SortOrder.Descending, messageSort: SortOrder.Ascending, pageSize: 10 }
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
    if (!exchangeService || !conversation) return;
    setError('');

    try {
      const response = await exchangeService.getById(
        conversation.id,
        exchangeId,
        { messageSort: SortOrder.Ascending }
      );

      console.log('[Exchange API] getById response:', response);
      setSuccessMessage('Exchange details loaded - check console');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to get exchange: ${message}`);
    }
  };

  const submitFeedback = async (exchangeId: string, rating: FeedbackRating) => {
    if (!exchangeService || !conversation) return;
    setError('');

    try {
      await exchangeService.createFeedback(
        conversation.id,
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
    if (!messageService || !conversation) return;
    setError('');

    try {
      const response = await messageService.getById(
        conversation.id,
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
    if (!messageService || !conversation) return;
    setError('');

    try {
      const response = await messageService.getContentPartById(
        conversation.id,
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
