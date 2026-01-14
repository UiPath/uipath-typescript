/**
 * useChat - Hook for real-time chat operations (WebSocket)
 */

import { useConversationalAgentContext } from '../context/ConversationalAgentContext';
import type {
  ExchangeEventHelper,
  MessageEventHelper,
  ContentPartEventHelper,
  ContentPartChunkEvent
} from '@uipath/uipath-typescript/conversational-agent';
import type { AttachmentInfo } from '../types';

export function useChat() {
  const { conversationalAgentService, conversation: convState, chat, attachment, ui } = useConversationalAgentContext();
  const { conversation } = convState;
  const { session, messages, inputMessage, setSession, setMessages, setInputMessage } = chat;
  const { pendingAttachments, isUploading, setPendingAttachments, setIsUploading } = attachment;
  const { setError, setSuccessMessage } = ui;

  const setupExchangeHandlers = (exchange: ExchangeEventHelper) => {
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
              setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
            });
          }
        });
      }
    });

    exchange.onExchangeEnd(() => {
      console.log('[Events] Exchange ended');
    });
  };

  const sendMessageWithAttachments = async (
    exchange: ExchangeEventHelper,
    messageText: string,
    attachments: AttachmentInfo[]
  ) => {
    const message = exchange.startMessage({ role: 'user' });

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
        console.log('[Events] Starting session for:', conversation.conversationId);

        conversationalAgentService.events.onAny((event) => {
          console.log('[Events] Received:', JSON.stringify(event, null, 2));
        });

        const sessionHelper = conversationalAgentService.events.startSession({
          conversationId: conversation.conversationId,
        });

        sessionHelper.onErrorStart((error) => {
          console.error('[Events] Session error:', error);
          setError(`Session error: ${error.message || 'Unknown error'}`);
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
    if (!conversationalAgentService || !conversation) return;

    setIsUploading(true);
    setError('');

    try {
      const response = await conversationalAgentService.conversations.attachments.upload(conversation.conversationId, file);
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
    removePendingAttachment
  };
}
