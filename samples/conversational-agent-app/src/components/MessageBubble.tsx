/**
 * MessageBubble - Individual message display with markdown support
 */

import ReactMarkdown from 'react-markdown'
import { MessageRole } from '@uipath/uipath-typescript/conversational-agent'
import type { ChatMessage } from '../context/ConversationalAgentContext'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  // Use SDK's MessageRole enum for role comparison
  const isUser = message.role === MessageRole.User
  const isSystem = message.role === MessageRole.System

  return (
    <div className={`px-6 py-4 ${isUser ? 'bg-transparent' : 'bg-chat-input/30'}`}>
      <div className="flex gap-4">
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
          isUser ? 'bg-blue-500/20' : isSystem ? 'bg-yellow-500/20' : 'bg-accent/20'
        }`}>
          {isUser ? (
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : isSystem ? (
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Role label */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {isUser ? 'You' : isSystem ? 'System' : 'Assistant'}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(message.timestamp)}
            </span>
          </div>

          {/* Message content */}
          <div className={`markdown-content ${message.isStreaming ? 'typing-cursor' : ''}`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                components={{
                  // Custom code block renderer
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match

                    if (isInline) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    }

                    return (
                      <div className="relative group">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(String(children))}
                            className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded"
                          >
                            Copy
                          </button>
                        </div>
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </div>
                    )
                  },
                  // Custom link renderer
                  a({ children, href, ...props }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                        {...props}
                      >
                        {children}
                      </a>
                    )
                  }
                }}
              >
                {message.content || (message.isStreaming ? '' : 'No content')}
              </ReactMarkdown>
            )}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded text-xs text-gray-400"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {attachment}
                </div>
              ))}
            </div>
          )}

          {/* Actions for assistant messages */}
          {!isUser && !isSystem && !message.isStreaming && (
            <div className="flex items-center gap-2 mt-3 opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={() => copyToClipboard(message.content)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Copy message"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Good response"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Bad response"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    // Could add a toast notification here
    console.log('Copied to clipboard')
  }).catch(err => {
    console.error('Failed to copy:', err)
  })
}
