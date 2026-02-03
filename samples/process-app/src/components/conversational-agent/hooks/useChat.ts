/**
 * useChat - Hook for real-time chat operations (WebSocket)
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';
import {
  FeedbackRating,
  type ExchangeEventHelper,
  type MessageEventHelper,
  type ContentPartEventHelper,
  type ContentPartChunkEvent
} from '@uipath/uipath-typescript/conversational-agent';
import type { AttachmentInfo } from '../types';

export function useChat() {
  const { conversationalAgentService, attachmentService, exchangeService, conversation: convState, chat, attachment, ui } = useConversationalAgentContext();
  const { conversation } = convState;
  const { session, messages, inputMessage, setSession, setMessages, setInputMessage } = chat;
  const { pendingAttachments, isUploading, setPendingAttachments, setIsUploading } = attachment;
  const { setError, setSuccessMessage } = ui;

  const setupExchangeHandlers = (exchange: ExchangeEventHelper) => {
    // Use exchange.exchangeId directly (not from startEvent)
    const exchangeId = exchange.exchangeId;
    console.log('[Events] Setting up handlers for exchange:', exchangeId);

    exchange.onErrorStart((error) => {
      console.error('[Events] Exchange error:', error);
      setError(`Exchange error: ${error.message}`);
    });

    exchange.onMessageStart((message: MessageEventHelper) => {
      if (message.startEvent.role === 'assistant') {
        message.onContentPartStart((contentPart: ContentPartEventHelper) => {
          if (contentPart.startEvent.mimeType.startsWith('text/')) {
            let fullContent = '';

            contentPart.onChunk((chunk: ContentPartChunkEvent) => {
              fullContent += chunk.data || '';
            });

            contentPart.onContentPartEnd(() => {
              console.log('[Events] Adding assistant message with exchangeId:', exchangeId);
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: fullContent,
                exchangeId // Include exchange ID for feedback
              }]);
            });
          }
        });
      }
    });

    exchange.onExchangeEnd(() => {
      console.log('[Events] Exchange ended:', exchangeId);
    });
  };

  const sendMessageWithAttachments = async (
    exchange: ExchangeEventHelper,
    messageText: string,
    attachments: AttachmentInfo[]
  ) => {
    const message = exchange.startMessage({});

    if (messageText.trim()) {
      await message.sendContentPart({ data: messageText, mimeType: 'text/markdown' });
    }

    for (const att of attachments) {
      message.startContentPart({
        mimeType: att.mimeType,
        name: att.name,
        externalValue: { uri: att.uri }
      }, async (_contentPart: ContentPartEventHelper) => {
        // No chunks needed for external values
      });
    }

    message.sendMessageEnd();
  };

  const sendMessage = async () => {
    if (!conversation || (!inputMessage.trim() && pendingAttachments.length === 0) || !conversationalAgentService) {
      return;
    }

    setError('');
    const messageText = inputMessage;
    const attachmentsToSend = [...pendingAttachments];
    setInputMessage('');
    setPendingAttachments([]);

    // Add message to UI
    const attachmentNames = attachmentsToSend.map(a => a.fileName).join(', ');
    setMessages(prev => [...prev, {
      role: 'user',
      content: messageText,
      attachments: attachmentsToSend.length > 0 ? attachmentNames : undefined
    }]);

    try {
      if (!session) {
        console.log('[Events] Starting session for:', conversation.id);

        // Start session via conversations sub-service
        const sessionHelper = conversationalAgentService.conversations.startSession({
          conversationId: conversation.id,
        });

        sessionHelper.onErrorStart((error) => {
          console.error('[Events] Session error:', error);
          const errorMessage = error.message || 'Unknown error';
          setError(`Session error: ${errorMessage}`);
          // Add error message to chat
          setMessages(prev => [...prev, {
            role: 'system',
            content: `Session error: ${errorMessage}`,
            isError: true
          }]);
        });

        // Handle session ending (server is closing the session)
        sessionHelper.onSessionEnding((event) => {
          console.log('[Events] Session ending:', event);
          const timeToLive = event.timeToLiveMS ? `${event.timeToLiveMS}ms` : 'soon';
          setMessages(prev => [...prev, {
            role: 'system',
            content: `Session ending in ${timeToLive}`,
            isError: true
          }]);
        });

        // Handle session end
        sessionHelper.onSessionEnd((event) => {
          console.log('[Events] Session ended:', event);
          setSession(null);
          setMessages(prev => [...prev, {
            role: 'system',
            content: 'Session disconnected. Send a new message to reconnect.',
            isError: true
          }]);
        });

        sessionHelper.onSessionStarted(() => {
          console.log('[Events] Session started');
          setSession(sessionHelper);

          const exchange = sessionHelper.startExchange();
          setupExchangeHandlers(exchange);

          if (attachmentsToSend.length > 0) {
            sendMessageWithAttachments(exchange, messageText, attachmentsToSend);
          } else {
            exchange.sendMessageWithContentPart({ data: messageText });
          }
        });
      } else {
        const exchange = session.startExchange();
        setupExchangeHandlers(exchange);

        if (attachmentsToSend.length > 0) {
          sendMessageWithAttachments(exchange, messageText, attachmentsToSend);
        } else {
          exchange.sendMessageWithContentPart({ data: messageText });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to send message: ${message}`);
    }
  };

  const uploadChatAttachment = async (file: File) => {
    if (!attachmentService || !conversation) return;

    setIsUploading(true);
    setError('');

    try {
      const response = await attachmentService.upload(conversation.id, file);
      console.log('[Chat Attachment] upload response:', response);

      setPendingAttachments(prev => [...prev, {
        ...response,
        fileName: file.name,
        fileSize: file.size
      }]);

      setSuccessMessage(`File "${file.name}" ready to send`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to upload file: ${message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const submitFeedback = async (exchangeId: string, rating: FeedbackRating) => {
    if (!exchangeService || !conversation) return;
    setError('');

    try {
      await exchangeService.createFeedback(
        conversation.id,
        exchangeId,
        { rating, comment: `Feedback: ${rating}` }
      );

      console.log('[Chat] Feedback submitted:', rating, 'for exchange:', exchangeId);
      setSuccessMessage(`Feedback submitted: ${rating === FeedbackRating.Positive ? 'Thumbs up' : 'Thumbs down'}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to submit feedback: ${message}`);
    }
  };

  return {
    session,
    messages,
    inputMessage,
    pendingAttachments,
    isUploading,
    hasSession: !!session,
    setInputMessage,
    sendMessage,
    uploadChatAttachment,
    removePendingAttachment,
    submitFeedback
  };
}
