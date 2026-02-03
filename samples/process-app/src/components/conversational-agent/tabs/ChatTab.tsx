/**
 * Chat Tab - Real-time chat interface with WebSocket events
 */

import { useRef } from 'react';
import { useChat, useConversations } from '../hooks';
import { FeedbackRating } from '@uipath/uipath-typescript/conversational-agent';

// Thumbs up/down icons as simple SVG components
const ThumbsUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const ThumbsDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
  </svg>
);

export function ChatTab() {
  const { conversation } = useConversations();
  const {
    messages,
    inputMessage,
    pendingAttachments,
    isUploading,
    hasSession,
    setInputMessage,
    sendMessage,
    uploadChatAttachment,
    removePendingAttachment,
    submitFeedback
  } = useChat();

  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadChatAttachment(file);
      if (chatFileInputRef.current) {
        chatFileInputRef.current.value = '';
      }
    }
  };

  if (!conversation) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-300 shadow-sm mt-4">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">
          {conversation.label || 'Conversation'}
        </h2>
        <p className="text-sm text-gray-600">ID: {conversation.id}</p>
        <p className={`text-sm ${hasSession ? 'text-green-600' : 'text-blue-600'}`}>
          {hasSession ? 'Session active' : 'Session will start when you send a message'}
        </p>
      </div>

      <div className="h-80 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            No messages yet. Start chatting!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === 'user'
                    ? 'justify-end'
                    : msg.role === 'system'
                      ? 'justify-center'
                      : 'justify-start'
                }`}
              >
                {/* System/Error messages */}
                {msg.role === 'system' ? (
                  <div className={`max-w-[85%] px-4 py-2 rounded-lg text-sm ${
                    msg.isError
                      ? 'bg-red-100 border border-red-300 text-red-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  /* User and Assistant messages */
                  <div className={`max-w-[70%] p-3 rounded-lg ${msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                    }`}>
                    <p className="text-xs font-semibold mb-1 opacity-75">
                      {msg.role === 'user' ? 'You' : 'Agent'}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.attachments && (
                      <p className="text-xs mt-1 opacity-75 italic">
                        Attachments: {msg.attachments}
                      </p>
                    )}
                    {/* Feedback buttons for assistant messages */}
                    {msg.role === 'assistant' && msg.exchangeId && (
                      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => submitFeedback(msg.exchangeId!, FeedbackRating.Positive)}
                          className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Thumbs up"
                        >
                          <ThumbsUpIcon />
                        </button>
                        <button
                          onClick={() => submitFeedback(msg.exchangeId!, FeedbackRating.Negative)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Thumbs down"
                        >
                          <ThumbsDownIcon />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Attachments Display */}
      {pendingAttachments.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 mb-1">Attachments to send:</p>
          <div className="flex flex-wrap gap-2">
            {pendingAttachments.map((att, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
              >
                {att.fileName}
                <button
                  onClick={() => removePendingAttachment(idx)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            ref={chatFileInputRef}
            type="file"
            onChange={handleChatFileSelect}
            className="hidden"
          />
          <button
            onClick={() => chatFileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            title="Attach file"
          >
            {isUploading ? '...' : '+'}
          </button>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded"
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() && pendingAttachments.length === 0}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
